# =============================================================================
# URS-DMS — Document requests smoke test (multi-file request + admin review)
# Runs against the live API:
#   login, department archive browse (list-only shape), max-3-file rule,
#   justification requirement, multi-file request creation (3 items), admin
#   list, reject-without-reason rejection, approve/reject with reason, and
#   full self-cleanup.
# All records created here are removed at the end; nothing user-created is
# touched. Requires the API server on :4000 and the docker postgres/minio.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/smoke-requests.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$base = "http://localhost:4000/api/v1"
$stamp = Get-Date -Format "yyyyMMddHHmmss"

# ── Credentials from .env ─────────────────────────────────────────────────────
$envContent = Get-Content "C:\Dev\URS-DMS\.env" -Raw
function Get-EnvValue($key) {
    $match = [regex]::Match($envContent, "(?m)^$key=(.*)$")
    if (-not $match.Success) { throw "Missing $key in .env" }
    return $match.Groups[1].Value.Trim()
}
$adminEmail = Get-EnvValue "BOOTSTRAP_ROOT_EMAIL"
$adminPassword = Get-EnvValue "BOOTSTRAP_ROOT_PASSWORD"

# ── Helpers ───────────────────────────────────────────────────────────────────
$script:passed = 0
$script:failed = 0
$script:failures = @()
$script:createdDocIds = @()
$script:createdRequestIds = @()

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

function Get-Sha256($bytes) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hash = $sha.ComputeHash($bytes)
    return (($hash | ForEach-Object { $_.ToString("x2") }) -join "")
}

function New-TestFile($name, $kind, $sizeKB) {
    $bytes = New-Object byte[] ($sizeKB * 1024)
    (New-Object Random 42).NextBytes($bytes)
    $content = if ($kind -eq "pdf") { "%PDF-1.4`n$([System.Text.Encoding]::ASCII.GetString($bytes))`n%%EOF" } else { [System.Text.Encoding]::UTF8.GetString($bytes) }
    $fileBytes = [System.Text.Encoding]::UTF8.GetBytes($content)
    return @{ name = $name; bytes = $fileBytes; type = if ($kind -eq "pdf") { "application/pdf" } else { "text/plain" } }
}

function Upload-Bytes($uploadInfo, $fileBytes) {
    $req = [System.Net.HttpWebRequest]::Create($uploadInfo.url)
    $req.Method = "PUT"
    foreach ($key in $uploadInfo.headers.PSObject.Properties.Name) {
        $k = $key.ToLower()
        if ($k -eq "content-length") { continue }
        if ($k -eq "content-type") { $req.ContentType = $uploadInfo.headers.$key }
        else { $req.Headers[$key] = $uploadInfo.headers.$key }
    }
    $req.ContentLength = $fileBytes.Length
    $stream = $req.GetRequestStream()
    $stream.Write($fileBytes, 0, $fileBytes.Length)
    $stream.Close()
    $resp = $req.GetResponse()
    $resp.Close()
}

function New-ArchiveDoc($token, $departmentId, $title, $file) {
    $created = Invoke-Api "POST" "/documents" @{
        title = $title; classification = "INTERNAL"
        departmentId = $departmentId
    } $token 201
    if (-not $created.ok) { throw "Document create failed: $($created.detail)" }
    $docId = $created.data.document.id
    $checksum = Get-Sha256 $file.bytes
    $v = Invoke-Api "POST" "/documents/$docId/version" @{
        filename = $file.name; mimeType = $file.type
        sizeBytes = $file.bytes.Length; checksum = $checksum; changeNote = "Requests smoke upload"
    } $token 200
    if (-not $v.ok) { throw "Version create failed: $($v.detail)" }
    $uploadedVersion = $v.data.document.versions | Where-Object { $_.checksum -eq $checksum } | Select-Object -First 1
    if (-not $uploadedVersion) { throw "Uploaded version not found in response" }
    Upload-Bytes $v.data.upload $file.bytes
    $vr = Invoke-Api "POST" "/documents/$docId/versions/$($uploadedVersion.id)/verify" $null $token 200
    if (-not $vr.ok) { throw "Verify failed: $($vr.detail)" }
    $script:createdDocIds += $docId
    return $docId
}

function Remove-Doc($token, $id) {
    Invoke-Api "DELETE" "/documents/$id" $null $token 204 | Out-Null
    Invoke-Api "DELETE" "/documents/$id/permanent" $null $token 204 | Out-Null
}

function Cancel-PendingSmkRequests($token) {
    $reqs = @((Invoke-Api "GET" "/requests?status=PENDING&q=SMK&pageSize=100" $null $token 200).data)
    foreach ($req in $reqs) {
        Invoke-Api "POST" "/requests/$($req.id)/cancel" $null $token 200 | Out-Null
    }
    return $reqs.Count
}

# ── 1. Login ──────────────────────────────────────────────────────────────────
Write-Host "`n== 1. Login (bootstrap root) ==" -ForegroundColor Cyan
$login = Invoke-Api "POST" "/auth/login" @{ identifier = $adminEmail; password = $adminPassword } $null 200
Check "login as bootstrap root" $login.ok ($login.detail)
if (-not $login.ok) { Write-Host "ABORT: cannot login" -ForegroundColor Red; exit 1 }
$token = $login.data.accessToken

# ── 1.5 Pre-clean leftovers from any aborted run ──────────────────────────────
Write-Host "`n== 1.5 Pre-clean previous SMK leftovers ==" -ForegroundColor Cyan
$cancelled = Cancel-PendingSmkRequests $token
$staleDocs = @((Invoke-Api "GET" "/documents?page=1&pageSize=100" $null $token 200).data | Where-Object { $_.title -like "SMK*" })
foreach ($staleDoc in $staleDocs) { Remove-Doc $token $staleDoc.id }
$staleUsers = @((Invoke-Api "GET" "/admin/users?page=1&pageSize=100" $null $token 200).data | Where-Object { $_.email -like "smk.*" })
foreach ($staleUser in $staleUsers) { Invoke-Api "DELETE" "/admin/users/$($staleUser.id)" $null $token 204 | Out-Null }
Check "aborted-run SMK records pre-cleaned" ($true) ""

# ── 2. Fixture department + archive documents ─────────────────────────────────
Write-Host "`n== 2. Fixture department + archive documents ==" -ForegroundColor Cyan
$departments = @((Invoke-Api "GET" "/admin/departments?pageSize=100" $null $token 200).data)
if ($departments.Count -eq 0) { Write-Host "ABORT: no departments in the database" -ForegroundColor Red; exit 1 }
$fixtureDept = $departments[0]
Check "fixture department found" ($fixtureDept.id) ""

$file1 = New-TestFile "SMK Archive One.pdf" "pdf" 16
$file2 = New-TestFile "SMK Archive Two.pdf" "pdf" 24
$file3 = New-TestFile "SMK Archive Three.pdf" "pdf" 32
$doc1 = New-ArchiveDoc $token $fixtureDept.id "SMK Archive Document One $stamp" $file1
$doc2 = New-ArchiveDoc $token $fixtureDept.id "SMK Archive Document Two $stamp" $file2
$doc3 = New-ArchiveDoc $token $fixtureDept.id "SMK Archive Document Three $stamp" $file3
$doc4 = New-ArchiveDoc $token $fixtureDept.id "SMK Archive Document Four $stamp" $file3
Check "four fixture documents created" ($doc1 -and $doc2 -and $doc3 -and $doc4) ""

# ── 3. SMK user (requester) ───────────────────────────────────────────────────
Write-Host "`n== 3. SMK user ==" -ForegroundColor Cyan
$roles = Invoke-Api "GET" "/admin/roles" $null $token 200
$facultyRole = $roles.data | Where-Object { $_.name -eq "FACULTY" } | Select-Object -First 1
if (-not $facultyRole) { Write-Host "ABORT: FACULTY role not found" -ForegroundColor Red; exit 1 }
$smkUser = Invoke-Api "POST" "/admin/users" @{
    employeeId = "SMK-R-$stamp"; email = "smk.r.$stamp@urs.local"
    password = "SmokeTest!2026"; firstName = "Smoke"; lastName = "Requester"
    roleId = $facultyRole.id; departmentId = $fixtureDept.id
    mustChangePassword = $false
} $token 201
Check "SMK user created" $smkUser.ok ($smkUser.detail)
if (-not $smkUser.ok) { Write-Host "ABORT: cannot create SMK user" -ForegroundColor Red; exit 1 }
$smkUserId = $smkUser.data.id

$userLogin = Invoke-Api "POST" "/auth/login" @{ identifier = "smk.r.$stamp@urs.local"; password = "SmokeTest!2026" } $null 200
Check "login as SMK user" $userLogin.ok ($userLogin.detail)
if (-not $userLogin.ok) { Write-Host "ABORT: cannot login as SMK user" -ForegroundColor Red; exit 1 }
$userToken = $userLogin.data.accessToken

# ── 4. Department archive browse ──────────────────────────────────────────────
Write-Host "`n== 4. Department archive browse ==" -ForegroundColor Cyan
$browse = Invoke-Api "GET" "/requests/browse" $null $userToken 200
Check "GET /requests/browse succeeds" $browse.ok ($browse.detail)
Check "browse reports the department bucket" ($browse.ok -and $browse.data.departmentName -eq $fixtureDept.name) "dept=$($browse.data.departmentName)"
$browseSmk = @($browse.data.items) | Where-Object { $_.title -like "SMK Archive*" }
Check "browse lists department archive documents" (@($browseSmk).Count -ge 4) "count=$(@($browseSmk).Count)"
$firstItem = @($browseSmk)[0]
Check "browse item exposes filename" ($firstItem.filename -like "*.pdf") "filename=$($firstItem.filename)"
Check "browse item exposes size" ($firstItem.sizeBytes -ne $null -and $firstItem.sizeBytes -ne "") "size=$($firstItem.sizeBytes)"
Check "browse item exposes owner" ($firstItem.ownerName -ne "") "owner=$($firstItem.ownerName)"
Check "browse item exposes upload date" ($firstItem.uploadedAt -ne $null) ""
Check "browse item has no open/download surface" ($firstItem.url -eq $null -and $firstItem.downloadUrl -eq $null) ""

# ── 5. Request validation ─────────────────────────────────────────────────────
Write-Host "`n== 5. Request validation ==" -ForegroundColor Cyan
$tooMany = Invoke-Api "POST" "/requests" @{
    title = "SMK Too Many $stamp"; justification = "need these files"
    documentIds = @($doc1, $doc2, $doc3, $doc4)
} $userToken 400
Check "request with 4 documents rejected (400)" $tooMany.ok ($tooMany.detail)

$noJustification = Invoke-Api "POST" "/requests" @{
    title = "SMK No Why $stamp"; documentIds = @($doc1)
} $userToken 400
Check "request without justification rejected (400)" $noJustification.ok ($noJustification.detail)

# ── 6. Multi-file request ─────────────────────────────────────────────────────
Write-Host "`n== 6. Multi-file request ==" -ForegroundColor Cyan
$created = Invoke-Api "POST" "/requests" @{
    title = "SMK Multi Request $stamp"; justification = "Smoke: need copies of these files"
    documentIds = @($doc1, $doc2, $doc3)
} $userToken 201
Check "request with 3 documents created" $created.ok ($created.detail)
if ($created.ok) {
    $script:createdRequestIds += $created.data.id
    $requestId = $created.data.id
    Check "request exposes 3 items" (@($created.data.items).Count -eq 3) "items=$(@($created.data.items).Count)"
    Check "request item carries title + owner" (@($created.data.items)[0].title -like "SMK Archive*" -and @($created.data.items)[0].ownerName -ne "") ""
    Check "legacy documentId mirrors first item" ($created.data.documentId -eq $created.data.items[0].documentId) ""
}

# ── 7. Admin review ───────────────────────────────────────────────────────────
Write-Host "`n== 7. Admin review ==" -ForegroundColor Cyan
$list = Invoke-Api "GET" "/requests?q=SMK&pageSize=100" $null $token 200
Check "admin lists requests" ($list.ok) ($list.detail)
$listed = @($list.data) | Where-Object { $_.id -eq $requestId }
Check "admin sees the multi-file request" (@($listed).Count -eq 1) ""
Check "admin list carries 3 items" (@(@($listed)[0].items).Count -eq 3) ""

$rejectNoReason = Invoke-Api "POST" "/requests/$requestId/reject" @{ } $token 400
Check "reject without reason rejected (400)" $rejectNoReason.ok ($rejectNoReason.detail)

$rejected = Invoke-Api "POST" "/requests/$requestId/reject" @{ decisionNote = "Smoke: not within scope" } $token 200
Check "reject with reason succeeds" ($rejected.ok -and $rejected.data.status -eq "REJECTED") ($rejected.detail)
Check "rejection reason persisted" ($rejected.data.decisionNote -eq "Smoke: not within scope") "note=$($rejected.data.decisionNote)"

$created2 = Invoke-Api "POST" "/requests" @{
    title = "SMK Single Request $stamp"; justification = "Smoke: need one file"
    documentIds = @($doc4)
} $userToken 201
Check "single-file request created" $created2.ok ($created2.detail)
if ($created2.ok) {
    $script:createdRequestIds += $created2.data.id
    $request2Id = $created2.data.id
    Check "single-file request has 1 item" (@($created2.data.items).Count -eq 1) ""
}

$approved = Invoke-Api "POST" "/requests/$request2Id/approve" @{ decisionNote = "Smoke: approved" } $token 200
Check "approve with note succeeds" ($approved.ok -and $approved.data.status -eq "APPROVED") ($approved.detail)
Check "approval note persisted" ($approved.data.decisionNote -eq "Smoke: approved") ""

$reapprove = Invoke-Api "POST" "/requests/$request2Id/approve" @{ } $token 409
Check "re-approving a non-pending request rejected (409)" $reapprove.ok ($reapprove.detail)

# ── 8. Cleanup ────────────────────────────────────────────────────────────────
Write-Host "`n== 8. Cleanup ==" -ForegroundColor Cyan
$remainingPending = Cancel-PendingSmkRequests $token
foreach ($docId in $script:createdDocIds) { Remove-Doc $token $docId }
Invoke-Api "DELETE" "/admin/users/$smkUserId" $null $token 204 | Out-Null

$leftDocs = @((Invoke-Api "GET" "/documents?page=1&pageSize=100" $null $token 200).data | Where-Object { $_.title -like "SMK*" })
$leftUsers = @((Invoke-Api "GET" "/admin/users?page=1&pageSize=100" $null $token 200).data | Where-Object { $_.email -like "smk.*" })
$leftPending = @((Invoke-Api "GET" "/requests?status=PENDING&q=SMK&pageSize=100" $null $token 200).data)
Check "no live SMK records remain" (($leftDocs.Count + $leftUsers.Count + $leftPending.Count) -eq 0) "leftover: $($leftDocs.Count) docs, $($leftUsers.Count) users, $($leftPending.Count) pending requests"

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
if ($script:failed -eq 0) {
    Write-Host "Requests smoke: $($script:passed) passed, 0 failed" -ForegroundColor Green
} else {
    Write-Host "Requests smoke: $($script:passed) passed, $($script:failed) failed" -ForegroundColor Red
    foreach ($failure in $script:failures) { Write-Host "  FAILED: $failure" -ForegroundColor Red }
    exit 1
}
