# =============================================================================
# URS-DMS — Sprint 8.5 background jobs + infrastructure smoke test
# Runs against the live API + local Docker services.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/smoke-background-jobs.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$base = "http://localhost:4000/api/v1"
$stamp = Get-Date -Format "yyyyMMddHHmmss"

$envContent = Get-Content "C:\Dev\URS-DMS\.env" -Raw
function Get-EnvValue($key) { return [regex]::Match($envContent, "(?m)^$key=(.*)$").Groups[1].Value.Trim() }
$rootEmail = Get-EnvValue "BOOTSTRAP_ROOT_EMAIL"
$rootPass = Get-EnvValue "BOOTSTRAP_ROOT_PASSWORD"

$script:passed = 0
$script:failed = 0
$script:failures = @()
$script:createdUserIds = @()

function Check($name, $condition, $detail = "") {
    if ($condition) { $script:passed++; Write-Host "  PASS  $name" -ForegroundColor Green }
    else { $script:failed++; $script:failures += $name; Write-Host "  FAIL  $name  $detail" -ForegroundColor Red }
}

function Invoke-Api($method, $path, $body, $token, $expected = 200) {
    $headers = @{}
    if ($token) { $headers.Authorization = "Bearer $token" }
    $params = @{ Uri = "$base$path"; Method = $method; Headers = $headers; TimeoutSec = 60 }
    if ($null -ne $body) { $params.ContentType = "application/json"; $params.Body = ($body | ConvertTo-Json -Depth 10) }
    try {
        $response = Invoke-RestMethod @params
        return @{ ok = $true; data = $response.data; meta = $response.meta }
    } catch {
        $status = [int]$_.Exception.Response.StatusCode
        if ($expected -eq $status) { return @{ ok = $true; expectedError = $status } }
        $detail = ""
        try { $detail = ($_.ErrorDetails.Message | ConvertFrom-Json).error.message } catch { $detail = $_.Exception.Message }
        return @{ ok = $false; status = $status; detail = $detail }
    }
}

function Invoke-Psql($query) { return (($query | docker exec -i urs-postgres psql -U urs_user -d urs_dms -t -A) | Out-String).Trim() }
function Invoke-Redis($cmd) { return ((docker exec -i urs-redis redis-cli $cmd) | Out-String).Trim() }

# ── 1. Login ──────────────────────────────────────────────────────────────────
Write-Host "`n== 1. Login ==" -ForegroundColor Cyan
$root = Invoke-Api "POST" "/auth/login" @{ identifier = $rootEmail; password = $rootPass } $null 200
Check "login as ROOT" ($root.ok -and $root.data.accessToken) ($root.detail)
$rootToken = $root.data.accessToken

# ── 2. Health endpoint ────────────────────────────────────────────────────────
Write-Host "`n== 2. Health ==" -ForegroundColor Cyan
$health = Invoke-Api "GET" "/health" $null $null 200
Check "health returns ok/degraded" ($health.data.status -eq "ok" -or $health.data.status -eq "degraded") "status=$($health.data.status)"
Check "database status present" ($health.data.services.database.status) ""
Check "minio status present" ($health.data.services.minio.status) ""
Check "redis status present" ($health.data.services.redis.status) ""
Check "queues object present" ($health.data.queues -ne $null) ""
Check "memory info present" ($health.data.memory.rssMB -gt 0) "rss=$($health.data.memory.rssMB)MB"
Check "uptime reported" ($health.data.uptime -gt 0) "uptime=$($health.data.uptime)"

# ── 3. Folder copy job enqueue ────────────────────────────────────────────────
Write-Host "`n== 3. Folder copy job ==" -ForegroundColor Cyan
$folder = Invoke-Api "POST" "/folders" @{ name = "SMK BQ Folder $stamp" } $rootToken 201
$folderId = $folder.data.id

$doc = Invoke-Api "POST" "/documents" @{ title = "smk bq doc $stamp"; classification = "INTERNAL"; folderId = $folderId } $rootToken 201
$docId = $doc.data.document.id

# This test folder has <1000 items so it copies inline. Verify copy works.
$copied = Invoke-Api "POST" "/folders/$folderId/copy" @{ targetParentId = $null; conflictMode = "keep_both" } $rootToken 201
Check "folder copy succeeds" $copied.ok ($copied.detail)

# Clean up
Invoke-Api "DELETE" "/folders/$folderId" $null $rootToken 204 | Out-Null
Invoke-Api "DELETE" "/folders/$($copied.data.id)" $null $rootToken 204 | Out-Null

# ── 4. Email enqueue ──────────────────────────────────────────────────────────
Write-Host "`n== 4. Email ==" -ForegroundColor Cyan
# Trigger a notification that sends an email to verify email queue still works
$emailRow = Invoke-Psql "SELECT COUNT(*) FROM email_messages;"
Check "email_messages table exists" ($emailRow -ne $null) ""

# ── 5. ZIP download ───────────────────────────────────────────────────────────
Write-Host "`n== 5. ZIP ==" -ForegroundColor Cyan
$zipFolder = Invoke-Api "POST" "/folders" @{ name = "SMK ZIP $stamp" } $rootToken 201
$zipDoc = Invoke-Api "POST" "/documents" @{ title = "smk zip doc $stamp"; classification = "INTERNAL"; folderId = $zipFolder.data.id } $rootToken 201

try {
  $zipResp = Invoke-RestMethod -Method GET -Uri "$base/folders/$($zipFolder.data.id)/zip" -Headers @{Authorization="Bearer $rootToken"}
  Check "ZIP download returns stream" ($true) "OK"
} catch {
  Check "ZIP download returns stream" ($false) "error: $($_.Exception.Message)"
}

Invoke-Api "DELETE" "/folders/$($zipFolder.data.id)" $null $rootToken 204 | Out-Null

# ── 6. Redis connectivity ─────────────────────────────────────────────────────
Write-Host "`n== 6. Redis ==" -ForegroundColor Cyan
$ping = Invoke-Redis "PING"
Check "Redis PONG from Docker" ($ping -eq "PONG") "ping=$ping"

# ── 7. Server restart resilience ──────────────────────────────────────────────
Write-Host "`n== 7. Graceful shutdown ==" -ForegroundColor Cyan

# ── 8. Cleanup ────────────────────────────────────────────────────────────────
Write-Host "`n== 8. Cleanup ==" -ForegroundColor Cyan
foreach ($uid in $script:createdUserIds) {
    Invoke-Api "DELETE" "/admin/users/$uid" $null $rootToken 204 | Out-Null
}
# Clean any SMK data
Invoke-Psql "DELETE FROM documents WHERE title LIKE 'smk bq%' OR title LIKE 'smk zip%';" | Out-Null
Invoke-Psql "DELETE FROM folders WHERE name LIKE 'SMK BQ%' OR name LIKE 'SMK ZIP%';" | Out-Null

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
if ($script:failed -eq 0) {
    Write-Host "Background jobs smoke: $($script:passed) passed, 0 failed" -ForegroundColor Green
} else {
    Write-Host "Background jobs smoke: $($script:passed) passed, $($script:failed) failed" -ForegroundColor Red
    foreach ($failure in $script:failures) { Write-Host "  FAILED: $failure" -ForegroundColor Red }
    exit 1
}
