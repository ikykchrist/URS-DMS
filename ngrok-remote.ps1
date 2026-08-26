# =============================================================================
# ngrok-remote.ps1 - URS-DMS remote backend launcher (Cloudflare Pages mode)
# -----------------------------------------------------------------------------
# DEVELOPMENT / REMOTE TESTING ONLY. NOT a production deployment.
#
# Architecture:
#   Cloudflare Pages (frontend) -> https://borough-percent-unlucky.ngrok-free.dev
#   -> Express -> Postgres / Redis / MinIO (all private)
#
# Non-destructive. Does NOT touch the database, Docker volumes, or any
# application functionality. No random URLs are parsed or rewritten: the ngrok
# domain is a STABLE account domain, so this script never regenerates env files.
#
# Flow (health-gated):
#   1. Docker services up?           -> if not, prompt
#   2. Local API health :4000 PASS?  -> if not, stop and show backend log
#   3. .env.remote present?          -> create once from .env (static overrides)
#   4. API running with .env.remote? -> if not, start it
#   5. ngrok backend tunnel up?      -> if not, start it (stable domain)
#   6. Public health PASS?           -> report (auto-retries ngrok once)
#
# Stop everything with:  .\ngrok-remote-stop.ps1
# =============================================================================

$ErrorActionPreference = 'Stop'
$root = 'C:\Dev\URS-DMS'
$domain = 'borough-percent-unlucky.ngrok-free.dev'
$publicBase = "https://$domain/api/v1"
$pagesUrl = 'https://urs-dms.pages.dev'

Write-Host '============================================================'
Write-Host ' URS-DMS - remote backend launcher (ngrok + Cloudflare Pages)'
Write-Host " Domain: $domain"
Write-Host '============================================================'

# -- 0. ngrok binary + auth ---------------------------------------------------
$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrok) {
    $candidates = @(
        "$env:LOCALAPPDATA\ngrok\ngrok.exe",
        "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe",
        'C:\Program Files\ngrok\ngrok.exe'
    )
    foreach ($c in $candidates) { if (Test-Path $c) { $ngrok = Get-Item $c; break } }
}
if (-not $ngrok) { Write-Error 'ngrok not found. Install with: winget install ngrok.ngrok' }
$ngrokPath = if ($ngrok.GetType().Name -eq 'ApplicationInfo') { $ngrok.Source } else { $ngrok.FullName }

& $ngrokPath config check 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error @'
ngrok is not authenticated. Run this once (get the token at https://dashboard.ngrok.com):
    ngrok config add-authtoken <YOUR_TOKEN>
'@
}

# -- 1. Infrastructure (docker) ------------------------------------------------
Write-Host ''
Write-Host '[1/6] Infrastructure'
$dockerOut = docker compose -f "$root\docker-compose.yml" ps --format '{{.Name}} {{.Status}}' 2>$null
$infraOk = $true
foreach ($svc in @('urs-postgres', 'urs-minio', 'urs-redis')) {
    $line = ($dockerOut | Where-Object { $_ -like "$svc*" } | Select-Object -First 1)
    if ($line -and $line -match '\(healthy\)') {
        Write-Host "  $svc ................ OK"
    } else {
        Write-Host "  $svc ................ DOWN"
        $infraOk = $false
    }
}
if (-not $infraOk) {
    Write-Host '  Starting containers...'
    docker compose -f "$root\docker-compose.yml" up -d postgres minio redis pgadmin | Out-Host
    Start-Sleep 10
}

# -- 2. .env.remote (static, created once) -------------------------------------
Write-Host ''
Write-Host '[2/6] Remote environment'
$envRemote = "$root\.env.remote"
if (-not (Test-Path $envRemote)) {
    $envContent = [IO.File]::ReadAllText("$root\.env")
    $envContent = [regex]::Replace($envContent, '(?m)^COOKIE_SECURE=.*$', 'COOKIE_SECURE=true')
    $envContent = [regex]::Replace($envContent, '(?m)^COOKIE_SAME_SITE=.*$', 'COOKIE_SAME_SITE=none')
    $envContent = [regex]::Replace($envContent, '(?m)^COOKIE_DOMAIN=.*$', 'COOKIE_DOMAIN=')
    [IO.File]::WriteAllText($envRemote, $envContent)
    Write-Host '  .env.remote created (cookie: SameSite=None + Secure for CF -> ngrok)'
} else {
    Write-Host '  .env.remote present (no URL regeneration needed)'
}

# -- 3. Ensure the API is running WITH .env.remote -----------------------------
$apiRemote = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -match 'tsx' -and $_.CommandLine -match 'env-file=.*\.env\.remote' } |
    Select-Object -First 1
if (-not $apiRemote) {
    Write-Host '  Starting API with .env.remote ...'
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
        Where-Object { $_.CommandLine -match 'tsx' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep 2
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', "cd /d $root\server && npx tsx watch --env-file=$envRemote src/server.ts > $root\logs\dev-server-console.log 2>&1"
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep 2
        try {
            $h = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/health' -TimeoutSec 5
            if ($h.data.status) { $ready = $true; break }
        } catch { }
    }
    if (-not $ready) { Write-Error 'API failed to start with .env.remote - check logs\dev-server-console.log' }
} else {
    Write-Host '  API (remote env) ... OK (already running)'
}

# -- 4. Local API health (MUST pass before ngrok starts) ----------------------
Write-Host ''
Write-Host '[3/6] Express (local)'
$localHealth = $null
for ($i = 0; $i -lt 20; $i++) {
    try {
        $localHealth = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/health' -TimeoutSec 5
        break
    } catch { Start-Sleep 3 }
}
if (-not $localHealth -or $localHealth.data.services.database.status -ne 'up' -or $localHealth.data.services.minio.status -ne 'up') {
    Write-Host 'BACKEND LOCAL HEALTH FAILED' -ForegroundColor Red
    Write-Host 'Showing the backend log below. Do NOT start ngrok until this is fixed.' -ForegroundColor Yellow
    if (Test-Path "$root\logs\dev-server-console.log") { Get-Content "$root\logs\dev-server-console.log" -Tail 30 }
    exit 1
}
Write-Host '  Backend ............. OK'
Write-Host "  Local health ........ OK ($($localHealth.data.status), db=$($localHealth.data.services.database.status), minio=$($localHealth.data.services.minio.status))"

# -- 5. ngrok (backend only, stable domain) ------------------------------------
Write-Host ''
Write-Host '[4/6] ngrok'
try { $tunnels = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 3 } catch { }
$publicUrl = $null
if ($tunnels) {
    foreach ($t in $tunnels.tunnels) {
        if ($t.name -eq 'backend' -and $t.public_url -like "https://$domain") { $publicUrl = $t.public_url }
    }
}
$userCfg = "$env:LOCALAPPDATA\ngrok\ngrok.yml"
$projectCfg = "$root\ngrok-tunnels.yml"
if (-not $publicUrl) {
    Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep 2
    New-Item -ItemType Directory -Path "$root\logs" -Force | Out-Null
    Start-Process -FilePath $ngrokPath `
        -ArgumentList 'start', '--config', "`"$userCfg`"", '--config', "`"$projectCfg`"", 'backend', '--log=stdout' `
        -RedirectStandardOutput "$root\logs\ngrok.log" `
        -RedirectStandardError "$root\logs\ngrok.err.log" `
        -WindowStyle Hidden
    for ($i = 0; $i -lt 90; $i++) {
        Start-Sleep 1
        try {
            $tunnels = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 3
            foreach ($t in $tunnels.tunnels) {
                if ($t.name -eq 'backend' -and $t.public_url) { $publicUrl = $t.public_url; break }
            }
        } catch { }
        if ($publicUrl) { break }
    }
} else {
    Write-Host '  Existing backend tunnel found - reusing it.'
}
if (-not $publicUrl) { Write-Error 'ngrok tunnel did not become ready (see logs\ngrok.err.log)' }
Write-Host "  Domain ............. $domain"
Write-Host "  Tunnel ............. OK ($publicUrl)"

# -- 6. Public health ------------------------------------------------------------
Write-Host ''
Write-Host '[5/6] Public API'
function Test-PublicHealth {
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep 4
        try {
            $h = Invoke-RestMethod -Uri "$publicBase/health" -TimeoutSec 10 -Headers @{ 'ngrok-skip-browser-warning' = '1' }
            if ($h.data.status -and $h.data.services.database.status -eq 'up' -and $h.data.services.minio.status -eq 'up') {
                return $true
            }
        } catch { }
    }
    return $false
}
if (Test-PublicHealth) {
    Write-Host "  Public health ...... OK ($publicBase/health)"
} else {
    Write-Host '  Public health FAILED - restarting ngrok once and retrying ...'
    Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep 3
    Start-Process -FilePath $ngrokPath `
        -ArgumentList 'start', '--config', "`"$userCfg`"", '--config', "`"$projectCfg`"", 'backend', '--log=stdout' `
        -RedirectStandardOutput "$root\logs\ngrok.log" `
        -RedirectStandardError "$root\logs\ngrok.err.log" `
        -WindowStyle Hidden
    if (Test-PublicHealth) {
        Write-Host "  Public health ...... OK (after ngrok restart: $publicBase/health)"
    } else {
        Write-Warning 'Public health still failing after ngrok restart (see logs\ngrok.err.log)'
        exit 1
    }
}

Write-Host ''
Write-Host '[6/6] REMOTE TESTING READY'
Write-Host '============================================================'
Write-Host "  Frontend (Cloudflare Pages): $pagesUrl"
Write-Host "  Backend (ngrok, stable):     $publicBase/health"
Write-Host '============================================================'
Write-Host 'Backend/ngrok restarts keep the SAME domain - no redeploy,'
Write-Host 'no env regeneration needed. Stop with:  .\ngrok-remote-stop.ps1'
