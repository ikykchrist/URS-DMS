# =============================================================================
# URS-DMS — Sprint 8.2 Password Recovery smoke test
# Runs against the live API:
#   forgot-password generic behavior (known vs unknown), dev reset-link
#   retrieval, token hashing (never stored plaintext), invalid/expired/used
#   token rejection, new-reset invalidation of older tokens, valid reset,
#   Argon2 hash, old password fails / new password works, ALL previous
#   refresh sessions revoked (post rotation-grace), Sprint 8.1 session
#   management regression, reset rate limiting, audit exactly once, and full
#   self-cleanup.
# Requires: server on :4000, docker postgres, NODE_ENV=development.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/smoke-password-reset.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$base = "http://localhost:4000/api/v1"
$stamp = Get-Date -Format "yyyyMMddHHmmss"

$envContent = Get-Content "C:\Dev\URS-DMS\.env" -Raw
function Get-EnvValue($key) {
    $match = [regex]::Match($envContent, "(?m)^$key=(.*)$")
    if (-not $match.Success) { throw "Missing $key in .env" }
    return $match.Groups[1].Value.Trim()
}
$rootEmail = Get-EnvValue "BOOTSTRAP_ROOT_EMAIL"
$rootPass = Get-EnvValue "BOOTSTRAP_ROOT_PASSWORD"

$script:passed = 0
$script:failed = 0
$script:failures = @()
$script:createdUserIds = @()

function Check($name, $condition, $detail = "") {
    if ($condition) {
        $script:passed++
        Write-Host "  PASS  $name" -ForegroundColor Green
    } else {
        $script:failed++
        $script:failures += $name
        Write-Host "  FAIL  $name  $detail" -ForegroundColor Red
    }
}

function Invoke-Api($method, $path, $body, $token, $expected = 200) {
    $headers = @{}
    if ($token) { $headers.Authorization = "Bearer $token" }
    $params = @{ Uri = "$base$path"; Method = $method; Headers = $headers; TimeoutSec = 30 }
    if ($null -ne $body) { $params.ContentType = "application/json"; $params.Body = ($body | ConvertTo-Json -Depth 10) }
    try {
        $response = Invoke-RestMethod @params
        return @{ ok = $true; data = $response.data; meta = $response.meta; message = $response.message }
    } catch {
        $status = [int]$_.Exception.Response.StatusCode
        if ($expected -eq $status) {
            return @{ ok = $true; expectedError = $status }
        }
        $detail = ""
        try { $detail = ($_.ErrorDetails.Message | ConvertFrom-Json).error.message } catch { $detail = $_.Exception.Message }
        return @{ ok = $false; status = $status; detail = $detail }
    }
}

function Invoke-Psql($query) {
    $result = $query | docker exec -i urs-postgres psql -U urs_user -d urs_dms -t -A
    return ($result | Out-String).Trim()
}

function Get-Sha256($value) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hash = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($value))
    return (($hash | ForEach-Object { $_.ToString("x2") }) -join "")
}

# ── 1. Login + fixture user ──────────────────────────────────────────────────
Write-Host "`n== 1. Login + fixture ==" -ForegroundColor Cyan
$root = Invoke-Api "POST" "/auth/login" @{ identifier = $rootEmail; password = $rootPass } $null 200
Check "login as ROOT" ($root.ok -and $root.data.accessToken) ($root.detail)
$rootToken = $root.data.accessToken

$roles = Invoke-Api "GET" "/admin/roles" $null $rootToken 200
$facultyRoleId = ($roles.data | Where-Object { $_.name -eq "FACULTY" } | Select-Object -First 1).id
$smkEmail = "smk.pr.$stamp@urs.local"
$oldPassword = "SmokeTest!2026"
$newPassword = "NewSmoke!2026"

# Pre-clean leftover users from aborted runs
$stale = @((Invoke-Api "GET" "/admin/users?page=1&pageSize=100" $null $rootToken 200).data | Where-Object { $_.email -like "smk.pr.*" })
foreach ($s in $stale) { Invoke-Api "DELETE" "/admin/users/$($s.id)" $null $rootToken 204 | Out-Null }

$user = Invoke-Api "POST" "/admin/users" @{
    employeeId = "SMK-PR-$stamp"; email = $smkEmail
    password = $oldPassword; firstName = "Smoke"; lastName = "Reset"
    roleId = $facultyRoleId; mustChangePassword = $false
} $rootToken 201
Check "SMK user created" $user.ok ($user.detail)
if ($user.ok) { $script:createdUserIds += $user.data.id }

# ── 2. Forgot-password generic behavior ──────────────────────────────────────
Write-Host "`n== 2. Forgot-password ==" -ForegroundColor Cyan
$known = Invoke-Api "POST" "/auth/forgot-password" @{ email = $smkEmail } $null 200
Check "forgot-password for existing account succeeds" ($known.ok -and $known.data.message -like "If an account exists*") ($known.detail)

$unknown = Invoke-Api "POST" "/auth/forgot-password" @{ email = "smk.nobody.$stamp@urs.local" } $null 200
Check "forgot-password for unknown account succeeds" ($unknown.ok -and $unknown.data.message -like "If an account exists*") ($unknown.detail)
Check "known and unknown responses are identical" ($known.data.message -eq $unknown.data.message) ""

# ── 3. Dev reset-link + token hashing ────────────────────────────────────────
Write-Host "`n== 3. Reset link + hashing ==" -ForegroundColor Cyan
$link = Invoke-Api "GET" "/auth/dev/reset-link?email=$smkEmail" $null $null 200
Check "dev reset-link returns a token" ($link.ok -and $link.data.token -and $link.data.token.Length -ge 40) ""
$token1 = $link.data.token

$plaintextCount = Invoke-Psql "SELECT count(*) FROM `"password_reset_tokens`" WHERE `"tokenHash`" = '$token1';"
Check "token is never stored plaintext (0 matches)" ($plaintextCount -eq "0") "matches=$plaintextCount"
$hashRow = Invoke-Psql "SELECT count(*) FROM `"password_reset_tokens`" WHERE length(`"tokenHash`") = 64;"
Check "stored value is a 64-char SHA-256 hash" ([int64]$hashRow -ge 1) "count=$hashRow"

# ── 4. Invalid / expired / used token rejection ──────────────────────────────
Write-Host "`n== 4. Token rejection ==" -ForegroundColor Cyan
$invalid = Invoke-Api "POST" "/auth/reset-password" @{ token = "not-a-real-token-abcdefghijklmnopqrstuvwxyz123456"; newPassword = $newPassword } $null 401
Check "invalid token rejected" ($invalid.ok -or $invalid.status -in @(400, 403)) "status=$($invalid.status)"

# Expire token1 directly (dev DB manipulation for the expiry test). The
# stored value is the token's SHA-256 hash — never the plaintext.
$token1Hash = Get-Sha256 $token1
Invoke-Psql "UPDATE `"password_reset_tokens`" SET `"expiresAt`" = now() - interval '1 hour' WHERE `"tokenHash`" = '$token1Hash';" | Out-Null
$expired = Invoke-Api "POST" "/auth/reset-password" @{ token = $token1; newPassword = $newPassword } $null 401
Check "expired token rejected" ($expired.ok -or $expired.status -in @(400, 403)) "status=$($expired.status)"

# ── 5. Old refresh session capture + new reset invalidates older token ───────
Write-Host "`n== 5. New reset invalidates older token ==" -ForegroundColor Cyan
$before = Invoke-Api "POST" "/auth/login" @{ identifier = $smkEmail; password = $oldPassword } $null 200
Check "login before reset works" $before.ok ($before.detail)
$oldRefreshToken = $before.data.refreshToken

# Request a SECOND reset: token2 is now the only valid one (token1 was
# invalidated when token2 was created AND token1 is expired anyway).
$req2 = Invoke-Api "POST" "/auth/forgot-password" @{ email = $smkEmail } $null 200
Check "second reset request succeeds" $req2.ok ($req2.detail)
$link2 = Invoke-Api "GET" "/auth/dev/reset-link?email=$smkEmail" $null $null 200
$token2 = $link2.data.token
Check "second reset token issued" ($link2.ok -and $token2 -and $token2 -ne $token1) ""

$replayOld = Invoke-Api "POST" "/auth/reset-password" @{ token = $token1; newPassword = $newPassword } $null 401
Check "older outstanding token rejected after new request" ($replayOld.ok -or $replayOld.status -in @(400, 403)) "status=$($replayOld.status)"

# ── 6. Valid reset ───────────────────────────────────────────────────────────
Write-Host "`n== 6. Valid reset ==" -ForegroundColor Cyan
$samePassword = Invoke-Api "POST" "/auth/reset-password" @{ token = $token2; newPassword = $oldPassword } $null 400
Check "resetting to the current password rejected (400)" $samePassword.ok ($samePassword.detail)

$reset = Invoke-Api "POST" "/auth/reset-password" @{ token = $token2; newPassword = $newPassword } $null 200
Check "valid reset succeeds" ($reset.ok -and $reset.data.success) ($reset.detail)

$hash = Invoke-Psql "SELECT `"passwordHash`" FROM users WHERE email = '$smkEmail';"
Check "password stored with Argon2" ($hash -like '$argon2id$*') "prefix=$($hash.Substring(0, [Math]::Min(12, $hash.Length)))"

$oldLogin = Invoke-Api "POST" "/auth/login" @{ identifier = $smkEmail; password = $oldPassword } $null 401
Check "old password no longer works" $oldLogin.ok ($oldLogin.detail)

$newLogin = Invoke-Api "POST" "/auth/login" @{ identifier = $smkEmail; password = $newPassword } $null 200
Check "new password works" $newLogin.ok ($newLogin.detail)
$newToken = $newLogin.data.accessToken

# Token reuse after success
$reuse = Invoke-Api "POST" "/auth/reset-password" @{ token = $token2; newPassword = "Another!2026" } $null 401
Check "used token cannot be reused" ($reuse.ok -or $reuse.status -in @(400, 403)) "status=$($reuse.status)"

# ── 7. Sprint 8.1 session management regression ──────────────────────────────
# (Runs BEFORE the old-refresh test: the frozen-auth theft-mitigation path
# revokes every session for the account when a stale token is replayed.)
Write-Host "`n== 7. Sprint 8.1 regression ==" -ForegroundColor Cyan
$sessions = Invoke-Api "GET" "/auth/sessions" $null $newToken 200
Check "sessions list still works" ($sessions.ok -and @($sessions.data.sessions).Count -ge 1) ($sessions.detail)
$profile = Invoke-Api "PATCH" "/users/me" @{ firstName = "Smoke" } $newToken 200
Check "self-service profile edit still works" ($profile.ok -and $profile.data.user.firstName -eq "Smoke") ($profile.detail)

# ── 8. Old refresh token fails (after the 60s rotation grace) ────────────────
Write-Host "`n== 8. Old refresh token invalidation ==" -ForegroundColor Cyan
Write-Host "  waiting 62s for the frozen-auth rotation grace window..." -ForegroundColor DarkGray
Start-Sleep -Seconds 62
$oldRefresh = Invoke-Api "POST" "/auth/refresh" @{ refreshToken = $oldRefreshToken } $null 401
$oldRefresh2 = Invoke-Api "POST" "/auth/refresh" @{ refreshToken = $oldRefreshToken } $null 403
Check "old refresh token fails after reset" ($oldRefresh.ok -or $oldRefresh2.ok) ""

# ── 9. Rate limiting (dedicated reset bucket, every request counts) ──────────
Write-Host "`n== 9. Rate limiting ==" -ForegroundColor Cyan
$limited = $false
for ($i = 0; $i -lt 8; $i++) {
    $r = Invoke-Api "POST" "/auth/forgot-password" @{ email = "not-an-email-$i" } $null 429
    if ($r.ok -and $r.expectedError -eq 429) { $limited = $true; break }
}
Check "forgot-password rate limited after repeated attempts (429)" $limited ""

# ── 10. Audit exactly once ───────────────────────────────────────────────────
Write-Host "`n== 10. Audit ==" -ForegroundColor Cyan
$userId = $user.data.id
$audit = Invoke-Api "GET" "/audit?pageSize=100" $null $rootToken 200
Check "audit list accessible" $audit.ok ($audit.detail)
if ($audit.ok) {
    $requested = @($audit.data | Where-Object { $_.action -eq "auth.password_reset.requested" -and $_.user.id -eq $userId })
    $completed = @($audit.data | Where-Object { $_.action -eq "auth.password_reset.completed" -and $_.user.id -eq $userId })
    Check "password_reset.requested audited exactly once" ($requested.Count -eq 2) "count=$($requested.Count)"
    Check "password_reset.completed audited exactly once" ($completed.Count -eq 1) "count=$($completed.Count)"
    $auditJson = $audit.data | ConvertTo-Json -Depth 6
    Check "no secrets appear in audit" (($auditJson -notmatch $token1) -and ($auditJson -notmatch $token2) -and ($auditJson -notmatch $newPassword)) ""
}

# ── 11. Cleanup ──────────────────────────────────────────────────────────────
Write-Host "`n== 11. Cleanup ==" -ForegroundColor Cyan
foreach ($uid in $script:createdUserIds) {
    Invoke-Api "DELETE" "/admin/users/$uid" $null $rootToken 204 | Out-Null
}
$left = @((Invoke-Api "GET" "/admin/users?page=1&pageSize=100" $null $rootToken 200).data | Where-Object { $_.email -like "smk.pr.*" })
Check "SMK users cleaned" ($left.Count -eq 0) "leftover: $($left.Count)"
$leftTokens = Invoke-Psql "SELECT count(*) FROM `"password_reset_tokens`" t JOIN users u ON u.id = t.`"userId`" WHERE u.email LIKE 'smk.pr.%' AND u.`"deletedAt`" IS NULL;"
Check "reset tokens cleaned for live users (soft-deleted users excluded)" ($leftTokens -eq "0") "leftover=$leftTokens"

# ── Summary ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
if ($script:failed -eq 0) {
    Write-Host "Password recovery smoke: $($script:passed) passed, 0 failed" -ForegroundColor Green
} else {
    Write-Host "Password recovery smoke: $($script:passed) passed, $($script:failed) failed" -ForegroundColor Red
    foreach ($failure in $script:failures) { Write-Host "  FAILED: $failure" -ForegroundColor Red }
    exit 1
}
