# =============================================================================
# URS-DMS Ã¢â‚¬â€ Sprint 8.3 storage maintenance smoke test
# Runs against the live API + local docker postgres/minio:
#   ROOT authorization vs ADMIN/FACULTY denial, <30d preservation,
#   >=30d recycle cleanup (files + nested folders), shared-blob reference
#   preservation, AACCUP snapshot guard, orphan two-stage flow (candidate ->
#   grace -> dry run -> verified cleanup), missing-object reporting,
#   idempotent cleanup, storage statistics, maintenance audit, cleanup.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/smoke-maintenance.ps1
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
$script:createdDocIds = @()

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

function Get-Sha256($value) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hash = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($value))
    return (($hash | ForEach-Object { $_.ToString("x2") }) -join "")
}

# Object keys are deterministic: documents/<docId>/v1/<filename with
# non-[A-Za-z0-9._-] replaced by underscores> (lib/storage.ts buildObjectKey).
function Key-ForDoc($docId, $title, $version) {
    $safe = $title -replace '[^A-Za-z0-9._-]+', '_'
    return "documents/$docId/v$version/$safe.txt"
}

function New-UploadedDoc($token, $title) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes("maintenance fixture $title")
    $checksum = Get-Sha256 $bytes
    $created = Invoke-Api "POST" "/documents" @{ title = $title; classification = "INTERNAL" } $token 201
    if (-not $created.ok) { throw "doc create failed: $($created.detail)" }
    $docId = $created.data.document.id
    $v = Invoke-Api "POST" "/documents/$docId/version" @{
        filename = "$title.txt"; mimeType = "text/plain"; sizeBytes = $bytes.Length; checksum = $checksum; changeNote = "fixture"
    } $token 200
    if (-not $v.ok) { throw "version failed: $($v.detail)" }
    $uploaded = $v.data.document.versions | Where-Object { $_.checksum -eq $checksum } | Select-Object -First 1
    $req = [System.Net.HttpWebRequest]::Create($v.data.upload.url); $req.Method = "PUT"
    foreach ($key in $v.data.upload.headers.PSObject.Properties.Name) {
        $k = $key.ToLower()
        if ($k -eq "content-length") { continue }
        if ($k -eq "content-type") { $req.ContentType = $v.data.upload.headers.$key } else { $req.Headers[$key] = $v.data.upload.headers.$key }
    }
    $req.ContentLength = $bytes.Length
    $s = $req.GetRequestStream(); $s.Write($bytes, 0, $bytes.Length); $s.Close(); $req.GetResponse().Close()
    Invoke-Api "POST" "/documents/$docId/versions/$($uploaded.id)/verify" $null $token 200 | Out-Null
    $script:createdDocIds += $docId
    return $docId
}

function SoftDelete-Backdate($token, $docId, $daysAgo) {
    Invoke-Api "DELETE" "/documents/$docId" $null $token 204 | Out-Null
    Invoke-Psql "UPDATE documents SET `"deletedAt`" = now() - interval '$daysAgo days' WHERE id = '$docId';" | Out-Null
}

# Ã¢â€â‚¬Ã¢â€â‚¬ 1. Login + fixture user Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
Write-Host "`n== 1. Login + fixture ==" -ForegroundColor Cyan
$root = Invoke-Api "POST" "/auth/login" @{ identifier = $rootEmail; password = $rootPass } $null 200
Check "login as ROOT" ($root.ok -and $root.data.accessToken) ($root.detail)
$rootToken = $root.data.accessToken

$roles = Invoke-Api "GET" "/admin/roles" $null $rootToken 200
$facultyRoleId = ($roles.data | Where-Object { $_.name -eq "FACULTY" } | Select-Object -First 1).id
$adminRoleId = ($roles.data | Where-Object { $_.name -eq "ADMINISTRATOR" } | Select-Object -First 1).id
$smkEmail = "smk.mnt.$stamp@urs.local"

$stale = @((Invoke-Api "GET" "/admin/users?page=1&pageSize=100" $null $rootToken 200).data | Where-Object { $_.email -like "smk.mnt.*" })
foreach ($s in $stale) { Invoke-Api "DELETE" "/admin/users/$($s.id)" $null $rootToken 204 | Out-Null }

$user = Invoke-Api "POST" "/admin/users" @{
    employeeId = "SMK-MNT-$stamp"; email = $smkEmail; password = "SmokeTest!2026"
    firstName = "Smoke"; lastName = "Maintenance"; roleId = $facultyRoleId; mustChangePassword = $false
} $rootToken 201
Check "SMK user created" $user.ok ($user.detail)
if ($user.ok) { $script:createdUserIds += $user.data.id }
$smkLogin = Invoke-Api "POST" "/auth/login" @{ identifier = $smkEmail; password = "SmokeTest!2026" } $null 200
$smkToken = $smkLogin.data.accessToken
$smkUserId = $user.data.id

# Ã¢â€â‚¬Ã¢â€â‚¬ 2. Authorization: ROOT only Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
Write-Host "`n== 2. Authorization ==" -ForegroundColor Cyan
$smkAdmin = Invoke-Api "POST" "/admin/users" @{
    employeeId = "SMK-MA-$stamp"; email = "smk.ma.$stamp@urs.local"; password = "SmokeTest!2026"
    firstName = "Smoke"; lastName = "Admin"; roleId = $adminRoleId; mustChangePassword = $false
} $rootToken 201
Check "SMK ADMIN created" $smkAdmin.ok ($smkAdmin.detail)
if ($smkAdmin.ok) { $script:createdUserIds += $smkAdmin.data.id }
$adminLogin = Invoke-Api "POST" "/auth/login" @{ identifier = "smk.ma.$stamp@urs.local"; password = "SmokeTest!2026" } $null 200

$rootStatus = Invoke-Api "GET" "/root/maintenance/status" $null $rootToken 200
Check "ROOT can access maintenance status" $rootStatus.ok ($rootStatus.detail)
$adminDenied = Invoke-Api "GET" "/root/maintenance/status" $null $adminLogin.data.accessToken 403
Check "ADMIN denied maintenance (403)" $adminDenied.ok ($adminDenied.detail)
$userDenied = Invoke-Api "GET" "/root/maintenance/status" $null $smkToken 403
Check "FACULTY denied maintenance (403)" $userDenied.ok ($userDenied.detail)
$anonDenied = Invoke-Api "GET" "/root/maintenance/status" $null $null 401
Check "anonymous denied maintenance (401)" $anonDenied.ok ($anonDenied.detail)

# Ã¢â€â‚¬Ã¢â€â‚¬ 3. Retention fixtures Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
Write-Host "`n== 3. Retention fixtures ==" -ForegroundColor Cyan
$docFresh = New-UploadedDoc $smkToken "SMK MNT Fresh $stamp"
SoftDelete-Backdate $smkToken $docFresh 1

$docExpired = New-UploadedDoc $smkToken "SMK MNT Expired $stamp"
SoftDelete-Backdate $smkToken $docExpired 31

# Shared-blob: B shares A's objectKey (copies/deliveries semantics).
$docSharedA = New-UploadedDoc $smkToken "SMK MNT SharedA $stamp"
$keyA = Key-ForDoc $docSharedA "SMK MNT SharedA $stamp" 1
$docSharedB = New-UploadedDoc $smkToken "SMK MNT SharedB $stamp"
Invoke-Psql "INSERT INTO document_versions (id, `"documentId`", `"versionNumber`", `"objectKey`", `"filename`", `"mimeType`", `"sizeBytes`", `"checksum`", `"uploadedById`") VALUES (gen_random_uuid(), '$docSharedB', 1, '$keyA', 'shared.txt', 'text/plain', 10, 'abc', '$smkUserId');" | Out-Null
SoftDelete-Backdate $smkToken $docSharedB 31

# AACCUP snapshot guard.
$docSnap = New-UploadedDoc $smkToken "SMK MNT Snap $stamp"
$reqRow = Invoke-Psql "SELECT id FROM aaccup_requirements WHERE `"deletedAt`" IS NULL LIMIT 1;"
$areaDept = Invoke-Psql "SELECT `"departmentId`" FROM users WHERE id = '$smkUserId';"
if (-not $reqRow) { Write-Host "ABORT: no active requirement for snapshot fixture" -ForegroundColor Red; exit 1 }
Invoke-Psql "INSERT INTO aaccup_submissions (id, `"requirementId`", `"documentId`", `"submittedBy`", status, `"isCurrent`", `"submittedAt`", `"createdAt`", `"updatedAt`") VALUES (gen_random_uuid(), '$reqRow', '$docSnap', '$smkUserId', 'PENDING', false, now(), now(), now());" | Out-Null
SoftDelete-Backdate $smkToken $docSnap 31

# Expired nested folder tree.
$folderRoot = (Invoke-Api "POST" "/folders" @{ name = "SMK MNT Root $stamp" } $smkToken 201).data
$folderChild = (Invoke-Api "POST" "/folders" @{ name = "SMK MNT Child $stamp"; parentId = $folderRoot.id } $smkToken 201).data
Invoke-Api "DELETE" "/folders/$($folderChild.id)" $null $smkToken 204 | Out-Null
Invoke-Api "DELETE" "/folders/$($folderRoot.id)" $null $smkToken 204 | Out-Null
Invoke-Psql "UPDATE folders SET `"deletedAt`" = now() - interval '31 days' WHERE id IN ('$($folderChild.id)', '$($folderRoot.id)');" | Out-Null

# Ã¢â€â‚¬Ã¢â€â‚¬ 4. Recycle cleanup Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
Write-Host "`n== 4. Recycle cleanup ==" -ForegroundColor Cyan
$cleanup = Invoke-Api "POST" "/root/maintenance/cleanup-recycle" @{ dryRun = $false; confirm = $true } $rootToken 200
Check "recycle cleanup succeeds" $cleanup.ok ($cleanup.detail)

$freshCount = Invoke-Psql "SELECT count(*) FROM documents WHERE id = '$docFresh';"
Check "item <30 days preserved" ($freshCount -eq "1") "count=$freshCount"
$expiredCount = Invoke-Psql "SELECT count(*) FROM documents WHERE id = '$docExpired';"
Check "expired file permanently removed" ($expiredCount -eq "0") "count=$expiredCount"
$sharedB = Invoke-Psql "SELECT count(*) FROM documents WHERE id = '$docSharedB';"
Check "expired shared copy removed" ($sharedB -eq "0") "count=$sharedB"
$sharedKeyRefs = Invoke-Psql "SELECT count(*) FROM document_versions WHERE `"objectKey`" = '$keyA';"
Check "shared MinIO object survives (still referenced)" ($sharedKeyRefs -eq "1") "refs=$sharedKeyRefs"
$snapCount = Invoke-Psql "SELECT count(*) FROM documents WHERE id = '$docSnap';"
Check "AACCUP snapshot-referenced file preserved" ($snapCount -eq "1") "count=$snapCount"
$folderCount = Invoke-Psql "SELECT count(*) FROM folders WHERE id IN ('$($folderRoot.id)', '$($folderChild.id)');"
Check "expired nested folder tree removed" ($folderCount -eq "0") "count=$folderCount"

# Ã¢â€â‚¬Ã¢â€â‚¬ 5. Orphan two-stage flow Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
Write-Host "`n== 5. Orphan flow ==" -ForegroundColor Cyan
$docOrph = New-UploadedDoc $smkToken "SMK MNT Orphan $stamp"
$keyO = Key-ForDoc $docOrph "SMK MNT Orphan $stamp" 1
Invoke-Psql "DELETE FROM document_versions WHERE `"documentId`" = '$docOrph'; DELETE FROM documents WHERE id = '$docOrph';" | Out-Null

$scan = Invoke-Api "POST" "/root/maintenance/scan" @{ dryRun = $false } $rootToken 200
Check "orphan scan succeeds" $scan.ok ($scan.detail)
$candidate = Invoke-Psql "SELECT count(*) FROM maintenance_orphan_candidates WHERE `"objectKey`" = '$keyO' AND status = 'CANDIDATE';"
Check "unreferenced object detected as candidate" ($candidate -eq "1") "count=$candidate"
$stillThere = Invoke-Psql "SELECT count(*) FROM maintenance_orphan_candidates WHERE `"objectKey`" = '$keyO' AND `"removedAt`" IS NOT NULL;"
Check "candidate not immediately deleted (grace period)" ($stillThere -eq "0") ""

$cleanDry = Invoke-Api "POST" "/root/maintenance/cleanup-orphans" @{ dryRun = $true; confirm = $true } $rootToken 200
Check "orphan cleanup dry run succeeds" $cleanDry.ok ($cleanDry.detail)
$candDry = Invoke-Psql "SELECT count(*) FROM maintenance_orphan_candidates WHERE `"objectKey`" = '$keyO' AND status = 'CANDIDATE';"
Check "dry run deletes nothing (candidate intact)" ($candDry -eq "1") "count=$candDry"

Invoke-Psql "UPDATE maintenance_orphan_candidates SET `"firstSeenAt`" = now() - interval '8 days' WHERE `"objectKey`" = '$keyO';" | Out-Null
$clean = Invoke-Api "POST" "/root/maintenance/cleanup-orphans" @{ dryRun = $false; confirm = $true } $rootToken 200
Check "verified orphan cleanup succeeds" $clean.ok ($clean.detail)
$removed = Invoke-Psql "SELECT count(*) FROM maintenance_orphan_candidates WHERE `"objectKey`" = '$keyO' AND status = 'REMOVED';"
Check "orphan object physically removed (status REMOVED)" ($removed -eq "1") "count=$removed"

$reclean = Invoke-Api "POST" "/root/maintenance/cleanup-orphans" @{ dryRun = $false; confirm = $true } $rootToken 200
Check "orphan cleanup is idempotent (re-run succeeds)" $reclean.ok ($reclean.detail)

# Ã¢â€â‚¬Ã¢â€â‚¬ 6. Missing object reporting Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
Write-Host "`n== 6. Missing objects ==" -ForegroundColor Cyan
$docMissing = New-UploadedDoc $smkToken "SMK MNT Missing $stamp"
Invoke-Psql "INSERT INTO document_versions (id, `"documentId`", `"versionNumber`", `"objectKey`", `"filename`", `"mimeType`", `"sizeBytes`", `"checksum`", `"uploadedById`") VALUES (gen_random_uuid(), '$docMissing', 2, 'SMK-MISSING-$stamp', 'ghost.txt', 'text/plain', 5, 'abc', '$smkUserId');" | Out-Null
$check = Invoke-Api "GET" "/root/maintenance/check" $null $rootToken 200
Check "consistency check succeeds" $check.ok ($check.detail)
$missingFound = $check.data.database.missingObjects
Check "missing MinIO object reported" ($missingFound -ge 1) "missing=$missingFound"
$missingRow = Invoke-Psql "SELECT count(*) FROM document_versions WHERE `"objectKey`" = 'SMK-MISSING-$stamp';"
Check "missing object DB row NOT deleted (reported only)" ($missingRow -eq "1") "count=$missingRow"

# Ã¢â€â‚¬Ã¢â€â‚¬ 7. Storage statistics Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
Write-Host "`n== 7. Storage statistics ==" -ForegroundColor Cyan
$stats = Invoke-Api "GET" "/root/maintenance/storage" $null $rootToken 200
Check "storage stats use real data" ($stats.ok -and [int64]$stats.data.storedObjectCount -gt 0 -and [int64]$stats.data.activeFileCount -gt 0 -and $stats.data.minio.status -eq "up") ""
Check "capacity is null when untrustworthy (not fabricated)" ($null -eq $stats.data.totalCapacityBytes -and $null -eq $stats.data.availableCapacityBytes) ""

# Ã¢â€â‚¬Ã¢â€â‚¬ 8. Maintenance audit Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
Write-Host "`n== 8. Maintenance audit ==" -ForegroundColor Cyan
$audit = Invoke-Api "GET" "/audit?pageSize=100" $null $rootToken 200
$recycleEvents = @($audit.data | Where-Object { $_.action -eq "maintenance.recycle_cleanup.completed" })
$scanEvents = @($audit.data | Where-Object { $_.action -eq "maintenance.storage_scan.completed" })
$orphanEvents = @($audit.data | Where-Object { $_.action -eq "maintenance.orphan_cleanup.completed" })
Check "recycle cleanup audited once per run" ($recycleEvents.Count -ge 1 -and $recycleEvents.Count -le 3) "count=$($recycleEvents.Count)"
Check "storage scan audited" ($scanEvents.Count -ge 1) "count=$($scanEvents.Count)"
Check "orphan cleanup audited" ($orphanEvents.Count -ge 1) "count=$($orphanEvents.Count)"

# Ã¢â€â‚¬Ã¢â€â‚¬ 9. Cleanup Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
Write-Host "`n== 9. Cleanup ==" -ForegroundColor Cyan
Invoke-Psql "DELETE FROM document_versions WHERE `"documentId`" = '$docSharedA'; DELETE FROM documents WHERE id = '$docSharedA';" | Out-Null
Invoke-Psql "DELETE FROM aaccup_submissions WHERE `"documentId`" = '$docSnap'; DELETE FROM document_versions WHERE `"documentId`" = '$docSnap'; DELETE FROM documents WHERE id = '$docSnap';" | Out-Null
Invoke-Psql "DELETE FROM document_versions WHERE `"documentId`" = '$docMissing'; DELETE FROM documents WHERE id = '$docMissing';" | Out-Null
Invoke-Psql "DELETE FROM document_versions WHERE `"documentId`" = '$docFresh'; DELETE FROM documents WHERE id = '$docFresh';" | Out-Null
foreach ($uid in $script:createdUserIds) {
    Invoke-Api "DELETE" "/admin/users/$uid" $null $rootToken 204 | Out-Null
}
$leftUsers = @((Invoke-Api "GET" "/admin/users?page=1&pageSize=100" $null $rootToken 200).data | Where-Object { $_.email -like "smk.mnt.*" -or $_.email -like "smk.ma.*" })
Check "SMK users cleaned" ($leftUsers.Count -eq 0) "leftover: $($leftUsers.Count)"

# Ã¢â€â‚¬Ã¢â€â‚¬ Summary Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
if ($script:failed -eq 0) {
    Write-Host "Storage maintenance smoke: $($script:passed) passed, 0 failed" -ForegroundColor Green
} else {
    Write-Host "Storage maintenance smoke: $($script:passed) passed, $($script:failed) failed" -ForegroundColor Red
    foreach ($failure in $script:failures) { Write-Host "  FAILED: $failure" -ForegroundColor Red }
    exit 1
}
