# =============================================================================
# restart-server.ps1 - restart ONLY the URS-DMS API server
# -----------------------------------------------------------------------------
# Safe restart: stops the dedicated API supervisor (or legacy direct API
# process), never every node.exe. The supervisor restarts an API child after a
# fatal application exit and retains stdout/stderr for diagnosis.
# =============================================================================

$ErrorActionPreference = "Stop"
$serverDir = "C:\Dev\URS-DMS\server"
$logOut = "C:\Dev\URS-DMS\urs-server.log"
$logErr = "C:\Dev\URS-DMS\urs-server.err.log"
$supervisorOut = "C:\Dev\URS-DMS\urs-server-supervisor.out.log"
$supervisorErr = "C:\Dev\URS-DMS\urs-server-supervisor.err.log"
$healthUrl = "http://localhost:4000/api/v1/health"
$port = 4000

# 1. Stop the supervisor first, then fall back to the legacy direct API
# process. Never stop unrelated Node processes such as Vite or Codex.
$apiProcess = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -like "*scripts\\api-supervisor.cjs*" } |
    Select-Object -First 1

if (-not $apiProcess) {
    $apiProcess = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
        Where-Object { $_.CommandLine -like "*dist/server.js*" } |
        Select-Object -First 1
}

# Development instances run through tsx and therefore do not contain
# dist/server.js. Port 4000 is reserved by this project for the API, so its
# active listener is the safe final fallback (Vite and Codex use other ports).
if (-not $apiProcess) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($listener) {
        $portProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
        if ($portProcess) { $apiProcess = $portProcess }
    }
}

if ($apiProcess) {
    Write-Host "Stopping API server PID $($apiProcess.ProcessId) ..."
    Stop-Process -Id $apiProcess.ProcessId -Force
    Start-Sleep -Milliseconds 500
} else {
    Write-Host "No running API server process found (starting fresh)."
}

# 2. Wait until port 4000 is free (server may take a moment to release it).
$deadline = (Get-Date).AddSeconds(20)
while ((Get-Date) -lt $deadline) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $listener) { break }
    Start-Sleep -Milliseconds 500
}
if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
    Write-Error "Port $port is still in use after 20s; aborting."
    exit 1
}

# 3. Set the runtime env overrides before launching (process-scoped).
$env:DATABASE_URL = "postgresql://urs_user:urs_password@localhost:5432/urs_dms?schema=public"
$env:MINIO_ENDPOINT = "localhost"
# SMTP credentials are read from .env (EMAIL_PROVIDER=console by default).
# Never hardcode SMTP_PASS in this file - it would be committed to the repo.

# 4. Start the supervisor detached. It owns the API child and its logs.
Write-Host "Starting API supervisor (detached) ..."
$proc = Start-Process -FilePath "node.exe" `
    -ArgumentList "--env-file=C:\Dev\URS-DMS\.env", "scripts\api-supervisor.cjs" `
    -WorkingDirectory "C:\Dev\URS-DMS" `
    -RedirectStandardOutput $supervisorOut `
    -RedirectStandardError $supervisorErr `
    -WindowStyle Hidden `
    -PassThru
Write-Host "API supervisor PID $($proc.Id) started."

# 5. Poll the health endpoint and print the status.
$ready = $false
$pollDeadline = (Get-Date).AddSeconds(30)
while ((Get-Date) -lt $pollDeadline) {
    try {
        $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3
        if ($health.data.status) {
            Write-Host "health: $($health.data.status)"
            $ready = $true
            break
        }
    } catch {
        # not up yet - keep polling
    }
    Start-Sleep -Milliseconds 500
}

if (-not $ready) {
    Write-Host "health: FAILED - server did not become ready. Last log lines:"
    if (Test-Path $logErr) { Get-Content $logErr -Tail 20 }
    exit 1
}
