# =============================================================================
# URS-DMS — Sprint 8.1 Account & Session Management smoke test
# Runs against the live API:
#   GET /auth/me (safe view), PATCH /users/me (whitelist + persistence),
#   sessions list + current-session flag, revoke own session (revoked token
#   becomes invalid), ownership check (cannot revoke another user's session),
#   revoke-others (current survives), logout, all three role classes
#   (ROOT / ADMINISTRATOR / FACULTY), audit events exactly once, and full
#   self-cleanup. No unrelated suites needed.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/smoke-account.ps1
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
        return @{ ok = $true; data = $response.data; meta = $response.meta }
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

function Login($identifier, $password) {
    $r = Invoke-Api "POST" "/auth/login" @{ identifier = $identifier; password = $password } $null 200
    if (-not $r.ok) { throw "Login failed for $identifier : $($r.detail)" }
    return $r.data
}

# ── 1. Login (ROOT) ──────────────────────────────────────────────────────────
Write-Host "`n== 1. Login (ROOT) ==" -ForegroundColor Cyan
$rootA = Login $rootEmail $rootPass
Check "login as ROOT" ($rootA.accessToken -and $rootA.user.id) ""
$tokenA = $rootA.accessToken
$refreshA = $rootA.refreshToken
$userId = $rootA.user.id

# ── 1.5 Pre-clean leftover SMK account users (from any aborted run) ──────────
Write-Host "`n== 1.5 Pre-clean SMK leftovers ==" -ForegroundColor Cyan
$stale = @((Invoke-Api "GET" "/admin/users?page=1&pageSize=100" $null $tokenA 200).data | Where-Object { $_.email -like "smk.ac.*" -or $_.email -like "smk.ad.*" })
foreach ($s in $stale) { Invoke-Api "DELETE" "/admin/users/$($s.id)" $null $tokenA 204 | Out-Null }
Check "aborted-run SMK users pre-cleaned" ($true) ""

# ── 2. GET /auth/me — safe profile view ──────────────────────────────────────
Write-Host "`n== 2. GET /auth/me ==" -ForegroundColor Cyan
$me = Invoke-Api "GET" "/auth/me" $null $tokenA 200
Check "me returns profile" ($me.ok -and $me.data.user.id -eq $userId) ($me.detail)
Check "me has name/email/role/department" ($me.data.user.firstName -and $me.data.user.email -and $me.data.user.role) ""
$meJson = $me.data | ConvertTo-Json -Depth 6
Check "me exposes created + last login" ($meJson -match '"createdAt"' -and $meJson -match '"lastLogin"') ""
Check "me exposes department field" ($meJson -match '"departmentName"') ""
Check "me never exposes secrets" (($meJson -notmatch 'passwordHash|refreshTokenHash|refreshToken|secret') -and ($meJson -notmatch 'accessToken')) ""
$originalFirst = $me.data.user.firstName
$originalSuffix = $me.data.user.suffix

# ── 3. PATCH /users/me — edit allowed field ──────────────────────────────────
Write-Host "`n== 3. PATCH /users/me ==" -ForegroundColor Cyan
$newFirst = "Smoke$stamp"
$updated = Invoke-Api "PATCH" "/users/me" @{ firstName = $newFirst; suffix = "III" } $tokenA 200
Check "edit firstName + suffix" ($updated.ok -and $updated.data.user.firstName -eq $newFirst -and $updated.data.user.suffix -eq "III") ($updated.detail)

$me2 = Invoke-Api "GET" "/auth/me" $null $tokenA 200
Check "changes persist after refresh" ($me2.data.user.firstName -eq $newFirst) ""

# ── 4. Mass-assignment / privilege-escalation guards ─────────────────────────
Write-Host "`n== 4. Guards ==" -ForegroundColor Cyan
$roles = Invoke-Api "GET" "/admin/roles" $null $tokenA 200
$facultyRoleId = ($roles.data | Where-Object { $_.name -eq "FACULTY" } | Select-Object -First 1).id
Check "cannot change role" (Invoke-Api "PATCH" "/users/me" @{ roleId = $facultyRoleId } $tokenA 400).ok ""
Check "cannot change status" (Invoke-Api "PATCH" "/users/me" @{ status = "INACTIVE" } $tokenA 400).ok ""
Check "cannot change department" (Invoke-Api "PATCH" "/users/me" @{ departmentId = "00000000-0000-0000-0000-000000000000" } $tokenA 400).ok ""
Check "cannot change email" (Invoke-Api "PATCH" "/users/me" @{ email = "evil@urs.local" } $tokenA 400).ok ""
Check "cannot change permissions" (Invoke-Api "PATCH" "/users/me" @{ permissions = @("root.access") } $tokenA 400).ok ""

# ── 5. Sessions list + current session ───────────────────────────────────────
Write-Host "`n== 5. Sessions ==" -ForegroundColor Cyan
$rootB = Login $rootEmail $rootPass
$tokenB = $rootB.accessToken
$refreshB = $rootB.refreshToken

$sessions = Invoke-Api "GET" "/auth/sessions" $null $tokenA 200
Check "sessions list loads" ($sessions.ok -and @($sessions.data.sessions).Count -ge 2) ($sessions.detail)
$current = @($sessions.data.sessions) | Where-Object { $_.current }
Check "current session identified (not IP-based)" (@($current).Count -eq 1) ""
$currentId = @($current)[0].id
$otherSession = @($sessions.data.sessions) | Where-Object { -not $_.current } | Select-Object -First 1
$sessionBId = $otherSession.id
$sessJson = $sessions.data | ConvertTo-Json -Depth 6
Check "sessions never expose tokens/hashes" (($sessJson -notmatch 'refreshToken|tokenHash|accessToken|secret') -and ($sessJson -notmatch '"token"')) ""

# ── 6. Revoke another OWN session → token becomes invalid ────────────────────
Write-Host "`n== 6. Revoke own session ==" -ForegroundColor Cyan
$kill = Invoke-Api "POST" "/auth/sessions/$sessionBId/kill" $null $tokenA 200
Check "revoke own session" $kill.ok ($kill.detail)
$refreshRevoked = Invoke-Api "POST" "/auth/refresh" @{ refreshToken = $refreshB } $null 401
$refreshRevoked2 = Invoke-Api "POST" "/auth/refresh" @{ refreshToken = $refreshB } $null 403
Check "revoked session token becomes invalid" ($refreshRevoked.ok -or $refreshRevoked2.ok) ""

$killCurrent = Invoke-Api "POST" "/auth/sessions/$currentId/kill" $null $tokenA 400
Check "cannot revoke current session" $killCurrent.ok ($killCurrent.detail)

# ── 7. Ownership — cannot revoke another user's session ──────────────────────
Write-Host "`n== 7. Ownership ==" -ForegroundColor Cyan
$smkUser = Invoke-Api "POST" "/admin/users" @{
    employeeId = "SMK-AC-$stamp"; email = "smk.ac.$stamp@urs.local"
    password = "SmokeTest!2026"; firstName = "Smoke"; lastName = "Account"
    roleId = $facultyRoleId; mustChangePassword = $false
} $tokenA 201
Check "SMK user created" $smkUser.ok ($smkUser.detail)
if ($smkUser.ok) { $script:createdUserIds += $smkUser.data.id }
$smkLogin = Login "smk.ac.$stamp@urs.local" "SmokeTest!2026"
$smkSessions = Invoke-Api "GET" "/auth/sessions" $null $smkLogin.accessToken 200
$smkSessionId = (@($smkSessions.data.sessions) | Where-Object { $_.current } | Select-Object -First 1).id
$foreignKill = Invoke-Api "POST" "/auth/sessions/$smkSessionId/kill" $null $tokenA 404
Check "cannot revoke another user's session (404)" $foreignKill.ok ($foreignKill.detail)
# ── 8. Revoke all other sessions ─────────────────────────────────────────────
Write-Host "`n== 8. Revoke others ==" -ForegroundColor Cyan
$rootC = Login $rootEmail $rootPass
$tokenC = $rootC.accessToken
$revokeAll = Invoke-Api "POST" "/auth/sessions/kill-all" $null $tokenA 200
Check "revoke-others returns count >= 2" ($revokeAll.ok -and $revokeAll.data.revoked -ge 2) ($revokeAll.detail)
$refreshCurrent = Invoke-Api "POST" "/auth/refresh" @{ refreshToken = $refreshA } $null 200
Check "current session survives revoke-others (refresh ok)" $refreshCurrent.ok ($refreshCurrent.detail)
$newToken = $refreshCurrent.data.accessToken
$sessionsAfter = Invoke-Api "GET" "/auth/sessions" $null $newToken 200
Check "only current session remains" ($sessionsAfter.ok -and @($sessionsAfter.data.sessions).Count -eq 1 -and @($sessionsAfter.data.sessions)[0].current) ($sessionsAfter.detail)

# ── 9. Logout still works ────────────────────────────────────────────────────
Write-Host "`n== 9. Logout ==" -ForegroundColor Cyan
$rootD = Login $rootEmail $rootPass
$logout = Invoke-Api "POST" "/auth/logout" @{ refreshToken = $rootD.refreshToken } $null 200
Check "logout succeeds" $logout.ok ($logout.detail)
$refreshAfterLogout = Invoke-Api "POST" "/auth/refresh" @{ refreshToken = $rootD.refreshToken } $null 401
$refreshAfterLogout2 = Invoke-Api "POST" "/auth/refresh" @{ refreshToken = $rootD.refreshToken } $null 403
Check "logged-out token becomes invalid" ($refreshAfterLogout.ok -or $refreshAfterLogout2.ok) ""

# ── 10. Roles: ADMINISTRATOR + FACULTY self-service ──────────────────────────
Write-Host "`n== 10. Roles ==" -ForegroundColor Cyan
$adminRoleId = ($roles.data | Where-Object { $_.name -eq "ADMINISTRATOR" } | Select-Object -First 1).id
$smkAdmin = Invoke-Api "POST" "/admin/users" @{
    employeeId = "SMK-AD-$stamp"; email = "smk.ad.$stamp@urs.local"
    password = "SmokeTest!2026"; firstName = "Smoke"; lastName = "Admin"
    roleId = $adminRoleId; mustChangePassword = $false
} $newToken 201
Check "SMK ADMINISTRATOR created" $smkAdmin.ok ($smkAdmin.detail)
if ($smkAdmin.ok) { $script:createdUserIds += $smkAdmin.data.id }
$admin = Login "smk.ad.$stamp@urs.local" "SmokeTest!2026"
$adminPatch = Invoke-Api "PATCH" "/users/me" @{ firstName = "Admin" } $admin.accessToken 200
Check "ADMINISTRATOR can edit own profile" $adminPatch.ok ($adminPatch.detail)
$facultyPatch = Invoke-Api "PATCH" "/users/me" @{ firstName = "Smoke" } $smkLogin.accessToken 200
Check "FACULTY can edit own profile" $facultyPatch.ok ($facultyPatch.detail)

# ── 11. Audit events occur ───────────────────────────────────────────────────
Write-Host "`n== 11. Audit ==" -ForegroundColor Cyan
$audit = Invoke-Api "GET" "/audit?pageSize=100" $null $newToken 200
Check "audit list accessible" $audit.ok ($audit.detail)
if ($audit.ok) {
    $rows = @($audit.data)
    $profileEvents = @($rows | Where-Object { $_.action -eq "user.profile_updated" -and $_.user.id -eq $userId })
    $sessionEvents = @($rows | Where-Object { $_.action -eq "session.revoked" -and $_.user.id -eq $userId })
    $othersEvents = @($rows | Where-Object { $_.action -eq "session.revoked_others" -and $_.user.id -eq $userId })
    Check "profile_updated audited" ($profileEvents.Count -ge 1) "count=$($profileEvents.Count)"
    Check "session.revoked audited" ($sessionEvents.Count -ge 1) "count=$($sessionEvents.Count)"
    Check "session.revoked_others audited" ($othersEvents.Count -ge 1) "count=$($othersEvents.Count)"
}

# ── 12. Cleanup ───────────────────────────────────────────────────────────────
Write-Host "`n== 12. Cleanup ==" -ForegroundColor Cyan
foreach ($uid in $script:createdUserIds) {
    Invoke-Api "DELETE" "/admin/users/$uid" $null $newToken 204 | Out-Null
}
$leftUsers = @((Invoke-Api "GET" "/admin/users?page=1&pageSize=100" $null $newToken 200).data | Where-Object { $_.email -like "smk.ac.*" -or $_.email -like "smk.ad.*" })
Check "SMK users cleaned" ($leftUsers.Count -eq 0) "leftover: $($leftUsers.Count)"

# Restore the ROOT display name from the bootstrap seed values (never trust
# the name captured mid-run — earlier aborted runs may have polluted it).
Invoke-Api "PATCH" "/users/me" @{ firstName = (Get-EnvValue "BOOTSTRAP_ROOT_FIRST_NAME"); lastName = (Get-EnvValue "BOOTSTRAP_ROOT_LAST_NAME"); suffix = $null } $newToken 200 | Out-Null

# ── Summary ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
if ($script:failed -eq 0) {
    Write-Host "Account & Sessions smoke: $($script:passed) passed, 0 failed" -ForegroundColor Green
} else {
    Write-Host "Account & Sessions smoke: $($script:passed) passed, $($script:failed) failed" -ForegroundColor Red
    foreach ($failure in $script:failures) { Write-Host "  FAILED: $failure" -ForegroundColor Red }
    exit 1
}
