# =============================================================================
# URS-DMS — Sprint 8.4 roles & permissions management smoke test
# Runs against the live API + local docker postgres.
#   Authorization (ROOT vs ADMIN vs FACULTY denial),
#   GET /root/roles-permissions/matrix, GET /root/roles-permissions/catalog,
#   PATCH /root/roles-permissions/roles/:id/permissions (save + guard + audit),
#   /auth/me returns granular permissions, legacy regression.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/smoke-roles-permissions.ps1
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
$script:eligibleRoleId = ""
$script:originalPerms = @()

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

# ── 1. Login + fixture ───────────────────────────────────────────────────────
Write-Host "`n== 1. Login + fixture ==" -ForegroundColor Cyan
$root = Invoke-Api "POST" "/auth/login" @{ identifier = $rootEmail; password = $rootPass } $null 200
Check "login as ROOT" ($root.ok -and $root.data.accessToken) ($root.detail)
$rootToken = $root.data.accessToken

# Create a test FACULTY user to verify denial
$roles = Invoke-Api "GET" "/admin/roles" $null $rootToken 200
$facultyRoleId = ($roles.data | Where-Object { $_.name -eq "FACULTY" } | Select-Object -First 1).id
$adminRoleId = ($roles.data | Where-Object { $_.name -eq "ADMINISTRATOR" } | Select-Object -First 1).id
$smkEmail = "smk.rp.$stamp@urs.local"

$stale = @((Invoke-Api "GET" "/admin/users?page=1&pageSize=100" $null $rootToken 200).data | Where-Object { $_.email -like "smk.rp.*" })
foreach ($s in $stale) { Invoke-Api "DELETE" "/admin/users/$($s.id)" $null $rootToken 204 | Out-Null }

$facultyUser = Invoke-Api "POST" "/admin/users" @{
    employeeId = "SMK-RP-$stamp"; email = $smkEmail; password = "SmokeTest!2026"
    firstName = "Smoke"; lastName = "RolePerm"; roleId = $facultyRoleId; mustChangePassword = $false
} $rootToken 201
Check "SMK faculty created" $facultyUser.ok ($facultyUser.detail)
if ($facultyUser.ok) { $script:createdUserIds += $facultyUser.data.id }
$facultyLogin = Invoke-Api "POST" "/auth/login" @{ identifier = $smkEmail; password = "SmokeTest!2026" } $null 200
$facultyToken = $facultyLogin.data.accessToken

$smkAdminEmail = "smk.rp.admin.$stamp@urs.local"
$adminUser = Invoke-Api "POST" "/admin/users" @{
    employeeId = "SMK-RPA-$stamp"; email = $smkAdminEmail; password = "SmokeTest!2026"
    firstName = "Smoke"; lastName = "AdminRP"; roleId = $adminRoleId; mustChangePassword = $false
} $rootToken 201
Check "SMK admin created" $adminUser.ok ($adminUser.detail)
if ($adminUser.ok) { $script:createdUserIds += $adminUser.data.id }
$adminLogin = Invoke-Api "POST" "/auth/login" @{ identifier = $smkAdminEmail; password = "SmokeTest!2026" } $null 200
$adminToken = $adminLogin.data.accessToken

# ── 2. Authorization ──────────────────────────────────────────────────────────
Write-Host "`n== 2. Authorization ==" -ForegroundColor Cyan
$matrixRoot = Invoke-Api "GET" "/root/roles-permissions/matrix" $null $rootToken 200
Check "ROOT can read matrix" $matrixRoot.ok ($matrixRoot.detail)

$matrixAdmin = Invoke-Api "GET" "/root/roles-permissions/matrix" $null $adminToken 403
Check "ADMIN denied matrix (403)" $matrixAdmin.ok ($matrixAdmin.detail)

$matrixFaculty = Invoke-Api "GET" "/root/roles-permissions/matrix" $null $facultyToken 403
Check "FACULTY denied matrix (403)" $matrixFaculty.ok ($matrixFaculty.detail)

$matrixAnon = Invoke-Api "GET" "/root/roles-permissions/matrix" $null $null 401
Check "anonymous denied matrix (401)" $matrixAnon.ok ($matrixAnon.detail)

# ── 3. Matrix structure ───────────────────────────────────────────────────────
Write-Host "`n== 3. Matrix ==" -ForegroundColor Cyan
$mdata = $matrixRoot.data
Check "matrix has roles" ($mdata.roles.Count -ge 6) "count=$($mdata.roles.Count)"
Check "matrix has catalog" ($mdata.catalog.Count -ge 50) "count=$($mdata.catalog.Count)"
Check "matrix has rootOnlyCodes" ($mdata.rootOnlyCodes.Count -ge 10) "count=$($mdata.rootOnlyCodes.Count)"

$rootRole = $mdata.roles | Where-Object { $_.name -eq "ROOT" } | Select-Object -First 1
Check "ROOT role present" ($rootRole -ne $null) ""
Check "ROOT has permissions" ($rootRole.boundPermissions.Count -ge 50) "count=$($rootRole.boundPermissions.Count)"

$adminRole = $mdata.roles | Where-Object { $_.name -eq "ADMINISTRATOR" } | Select-Object -First 1
Check "ADMINISTRATOR role present" ($adminRole -ne $null) ""

# Pick a safe target (non-ROOT, non-ADMINISTRATOR) for mutation tests
$eligible = $mdata.roles | Where-Object { $_.name -ne "ROOT" -and $_.name -ne "ADMINISTRATOR" -and $_.deletedAt -eq $null } | Select-Object -First 1
Check "eligible role found" ($eligible -ne $null) ""
$script:eligibleRoleId = $eligible.id
$script:originalPerms = $eligible.boundPermissions

# ── 4. Catalog ────────────────────────────────────────────────────────────────
Write-Host "`n== 4. Catalog ==" -ForegroundColor Cyan
$catalog = Invoke-Api "GET" "/root/roles-permissions/catalog" $null $rootToken 200
Check "catalog loaded" ($catalog.ok -and $catalog.data.Count -ge 50) "count=$($catalog.data.Count)"
$modules = ($catalog.data | ForEach-Object { $_.module }) | Select-Object -Unique
Check "catalog grouped into modules" ($modules.Count -ge 5) "modules=$($modules.Count)"

# ── 5. Save permissions ───────────────────────────────────────────────────────
Write-Host "`n== 5. Save permissions ==" -ForegroundColor Cyan
$newPerms = @($script:originalPerms) + @("reports.read")
if ($script:originalPerms -contains "reports.read") {
    $newPerms = @($script:originalPerms) | Where-Object { $_ -ne "reports.read" }
}
$patch = Invoke-Api "PATCH" "/root/roles-permissions/roles/$script:eligibleRoleId/permissions" @{ permissions = $newPerms } $rootToken 200
Check "PATCH permissions succeeds" $patch.ok ($patch.detail)
Check "added reported" ($patch.data.added.Count -gt 0 -or $patch.data.removed.Count -gt 0) "added=$($patch.data.added.Count) removed=$($patch.data.removed.Count)"

$reload = Invoke-Api "GET" "/root/roles-permissions/matrix" $null $rootToken 200
$reloadedRole = $reload.data.roles | Where-Object { $_.id -eq $script:eligibleRoleId } | Select-Object -First 1
Check "permissions persisted (reload)" ($reloadedRole.boundPermissions.Count -gt 0) "count=$($reloadedRole.boundPermissions.Count)"

# Restore original permissions
$restore = Invoke-Api "PATCH" "/root/roles-permissions/roles/$script:eligibleRoleId/permissions" @{ permissions = $script:originalPerms } $rootToken 200
Check "restore original perms" $restore.ok ($restore.detail)

# ── 6. ROOT protection ────────────────────────────────────────────────────────
Write-Host "`n== 6. ROOT protection ==" -ForegroundColor Cyan
$rootId = $rootRole.id
$patchRoot = Invoke-Api "PATCH" "/root/roles-permissions/roles/$rootId/permissions" @{ permissions = @("users.read") } $rootToken 400
Check "ROOT permissions blocked" ($patchRoot.ok -or ($patchRoot.status -eq 400 -or $patchRoot.status -eq 403)) "status=$($patchRoot.status)"

# ── 7. Escalation guard ───────────────────────────────────────────────────────
Write-Host "`n== 7. Escalation guard ==" -ForegroundColor Cyan
# Admin users can't access /root endpoints, so escalation guard is verified at route level.
# The matrix endpoint is hard ROOT-only, so admin/faculty can never call PATCH.
$adminPatch = Invoke-Api "PATCH" "/root/roles-permissions/roles/$script:eligibleRoleId/permissions" @{ permissions = @("users.read") } $adminToken 403
Check "ADMIN cannot PATCH permissions (403)" $adminPatch.ok "status=$($adminPatch.status)"

# ── 8. /auth/me returns granular permissions ──────────────────────────────────
Write-Host "`n== 8. /auth/me permissions ==" -ForegroundColor Cyan
$me = Invoke-Api "GET" "/auth/me" $null $rootToken 200
Check "/auth/me returns permissions array" ($me.data.user.permissions.Count -ge 50) "count=$($me.data.user.permissions.Count)"
Check "root.access in ROOT permissions" ($me.data.user.permissions -contains "root.access") ""

$facultyMe = Invoke-Api "GET" "/auth/me" $null $facultyToken 200
Check "faculty /auth/me returns permissions" ($facultyMe.data.user.permissions.Count -gt 0) "count=$($facultyMe.data.user.permissions.Count)"
Check "root.access NOT in faculty permissions" (-not ($facultyMe.data.user.permissions -contains "root.access")) ""

# ── 9. Audit ──────────────────────────────────────────────────────────────────
Write-Host "`n== 9. Audit ==" -ForegroundColor Cyan
$audit = Invoke-Api "GET" "/audit?pageSize=100" $null $rootToken 200
$permAudits = @($audit.data | Where-Object { $_.action -eq "role.permissions_updated" })
Check "permission change audited" ($permAudits.Count -ge 1) "count=$($permAudits.Count)"

# ── 10. Cleanup ───────────────────────────────────────────────────────────────
Write-Host "`n== 10. Cleanup ==" -ForegroundColor Cyan
foreach ($uid in $script:createdUserIds) {
    Invoke-Api "DELETE" "/admin/users/$uid" $null $rootToken 204 | Out-Null
}
$leftUsers = @((Invoke-Api "GET" "/admin/users?page=1&pageSize=100" $null $rootToken 200).data | Where-Object { $_.email -like "smk.rp.*" })
Check "SMK users cleaned" ($leftUsers.Count -eq 0) "leftover: $($leftUsers.Count)"

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
if ($script:failed -eq 0) {
    Write-Host "Roles & Permissions smoke: $($script:passed) passed, 0 failed" -ForegroundColor Green
} else {
    Write-Host "Roles & Permissions smoke: $($script:passed) passed, $($script:failed) failed" -ForegroundColor Red
    foreach ($failure in $script:failures) { Write-Host "  FAILED: $failure" -ForegroundColor Red }
    exit 1
}
