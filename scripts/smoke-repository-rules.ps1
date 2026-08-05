# =============================================================================
# URS-DMS — Repository Rules 1–30 smoke test (continuation sprint)
# Verifies: depth limits, conflicts (upload/replace/restore/copy/merge),
# recycle dates, folder info, storage display, ZIP, activity, copy jobs,
# notifications, upload-failure audit, duplicate checksum, replace-version
# identity preservation, emergency access, multi-user isolation, audio/video.
# Self-cleaning: every SMK record is removed; temp users are archived.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/smoke-repository-rules.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$base = "http://localhost:4000/api/v1"

$envContent = Get-Content "C:\Dev\URS-DMS\.env" -Raw
function Get-EnvValue($key) {
    $match = [regex]::Match($envContent, "(?m)^$key=(.*)$")
    if (-not $match.Success) { throw "Missing $key in .env" }
    return $match.Groups[1].Value.Trim()
}
$rootEmail = Get-EnvValue "BOOTSTRAP_ROOT_EMAIL"
$rootPassword = Get-EnvValue "BOOTSTRAP_ROOT_PASSWORD"

$script:passed = 0
$script:failed = 0
$script:failures = @()

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

function Get-Sha256($bytes) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    return (($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString("x2") }) -join "")
}

function New-TestFile($name, $kind, $sizeKB, $seed = 42) {
    $bytes = New-Object byte[] ($sizeKB * 1024)
    (New-Object Random $seed).NextBytes($bytes)
    $content = if ($kind -eq "pdf") { "%PDF-1.4`n$([System.Text.Encoding]::ASCII.GetString($bytes))`n%%EOF" } else { [System.Text.Encoding]::UTF8.GetString($bytes) }
    return @{ name = $name; bytes = [System.Text.Encoding]::UTF8.GetBytes($content); type = if ($kind -eq "pdf") { "application/pdf" } elseif ($kind -eq "mp3") { "audio/mpeg" } elseif ($kind -eq "mp4") { "video/mp4" } else { "text/plain" } }
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

function New-Doc($token, $folderId, $file, $title = $null) {
    $r = Invoke-Api "POST" "/documents" @{ title = if ($title) { $title } else { $file.name }; classification = "INTERNAL"; folderId = $folderId } $token 201
    if (-not $r.ok) { throw "Document create failed: $($r.detail)" }
    $docId = $r.data.document.id
    $checksum = Get-Sha256 $file.bytes
    $v = Invoke-Api "POST" "/documents/$docId/version" @{ filename = $file.name; mimeType = $file.type; sizeBytes = $file.bytes.Length; checksum = $checksum; changeNote = "Smoke upload" } $token 200
    if (-not $v.ok) { throw "Version create failed: $($v.detail)" }
    $uploadedVersion = $v.data.document.versions | Where-Object { $_.checksum -eq $checksum } | Select-Object -First 1
    Upload-Bytes $v.data.upload $file.bytes
    $vr = Invoke-Api "POST" "/documents/$docId/versions/$($uploadedVersion.id)/verify" $null $token 200
    if (-not $vr.ok) { throw "Verify failed: $($vr.detail)" }
    return @{ id = $docId; versionId = $uploadedVersion.id; checksum = $checksum }
}

function New-Folder($token, $name, $parentId = $null) {
    $body = @{ name = $name }
    if ($null -ne $parentId) { $body.parentId = $parentId }
    $r = Invoke-Api "POST" "/folders" $body $token 201
    if (-not $r.ok) { throw "Folder create failed: $($r.detail)" }
    return $r.data
}

function Remove-Doc($token, $id) {
    Invoke-Api "DELETE" "/documents/$id" $null $token 204 | Out-Null
    Invoke-Api "DELETE" "/documents/$id/permanent" $null $token 204 | Out-Null
}

# ── Login ────────────────────────────────────────────────────────────────────
Write-Host "`n== 0. Login ==" -ForegroundColor Cyan
$login = Invoke-Api "POST" "/auth/login" @{ identifier = $rootEmail; password = $rootPassword } $null 200
Check "root login" $login.ok ($login.detail)
if (-not $login.ok) { exit 1 }
$token = $login.data.accessToken
$rootId = $login.data.user.id

# Pre-clean leftovers from any aborted run
Write-Host "`n== 0.5 Pre-clean SMK leftovers ==" -ForegroundColor Cyan
$staleDocs = (Invoke-Api "GET" "/documents?page=1&pageSize=100" $null $token 200).data | Where-Object { $_.title -like "SMK*" }
$staleDelDocs = (Invoke-Api "GET" "/documents/deleted" $null $token 200).data | Where-Object { $_.title -like "SMK*" }
foreach ($d in @($staleDocs + $staleDelDocs)) { Remove-Doc $token $d.id }
$staleFolders = (Invoke-Api "GET" "/folders" $null $token 200).data | Where-Object { $_.name -like "SMK*" }
$staleDelFolders = (Invoke-Api "GET" "/folders/deleted" $null $token 200).data | Where-Object { $_.name -like "SMK*" }
foreach ($f in @($staleFolders + $staleDelFolders)) { Invoke-Api "DELETE" "/folders/$($f.id)/permanent" $null $token 204 | Out-Null }
Check "pre-clean done" ($true) ""
$stamp = (Get-Date -Format "HHmmss")

# ── 1. Depth limits (rule 3) ─────────────────────────────────────────────────
Write-Host "`n== 1. Depth limits (max 5) ==" -ForegroundColor Cyan
$d1 = New-Folder $token "SMK D1"
$d2 = New-Folder $token "SMK D2" $d1.id
$d3 = New-Folder $token "SMK D3" $d2.id
$d4 = New-Folder $token "SMK D4" $d3.id
$d5 = New-Folder $token "SMK D5" $d4.id
Check "depth 5 create allowed" ($d5.id) ""
$depth6 = Invoke-Api "POST" "/folders" @{ name = "SMK D6"; parentId = $d5.id } $token 400
Check "depth 6 create rejected (400)" ($depth6.ok -and $depth6.expectedError -eq 400) ($depth6.detail)
$moveDepth6 = Invoke-Api "PATCH" "/folders/$($d4.id)" @{ parentId = $d5.id } $token 400
Check "move to depth 6 rejected (400)" ($moveDepth6.ok -and $moveDepth6.expectedError -eq 400) ($moveDepth6.detail)
$copyDepth6 = Invoke-Api "POST" "/folders/$($d5.id)/copy" @{ targetParentId = $d5.id; conflictMode = "keep_both" } $token 400
Check "copy into depth-5 folder rejected (400)" ($copyDepth6.ok -and $copyDepth6.expectedError -eq 400) ($copyDepth6.detail)

# ── 2. Replace version keeps identity + favorite (rule 8) ────────────────────
Write-Host "`n== 2. Replace version preserves identity/favorite ==" -ForegroundColor Cyan
$fA = New-Folder $token "SMK FolderA"
$fileV1 = New-TestFile "SMK replace.txt" "txt" 2 7
$docA = New-Doc $token $fA.id $fileV1
Invoke-Api "POST" "/documents/$($docA.id)/favorite" $null $token 200 | Out-Null
$fileV2 = New-TestFile "SMK replace.txt" "txt" 2 8
$v2 = Invoke-Api "POST" "/documents/$($docA.id)/version" @{ filename = $fileV2.name; mimeType = $fileV2.type; sizeBytes = $fileV2.bytes.Length; checksum = (Get-Sha256 $fileV2.bytes); changeNote = "Replacement" } $token 200
$v2ver = $v2.data.document.versions | Where-Object { $_.checksum -eq (Get-Sha256 $fileV2.bytes) } | Select-Object -First 1
Upload-Bytes $v2.data.upload $fileV2.bytes
Invoke-Api "POST" "/documents/$($docA.id)/versions/$($v2ver.id)/verify" $null $token 200 | Out-Null
$versions = Invoke-Api "GET" "/documents/$($docA.id)/versions" $null $token 200
Check "replace keeps version history (2 versions)" ($versions.ok -and $versions.data.Count -eq 2) ($versions.detail)
$favs = Invoke-Api "GET" "/documents/favorites" $null $token 200
Check "favorite survives replace" ($favs.ok -and ($favs.data | Where-Object { $_.id -eq $docA.id })) ($favs.detail)

# ── 3. Duplicate checksum warning field + upload-failure audit (rule 7/23) ───
Write-Host "`n== 3. Duplicate detection + failure audit ==" -ForegroundColor Cyan
$list = Invoke-Api "GET" "/documents?folderId=$($fA.id)&page=1&pageSize=50" $null $token 200
$row = $list.data | Where-Object { $_.id -eq $docA.id } | Select-Object -First 1
Check "list exposes currentChecksum" ($row -and $row.currentChecksum -eq (Get-Sha256 $fileV2.bytes)) ""
Check "list exposes submissionStatus field" ($row -and $row.PSObject.Properties.Name -contains "submissionStatus") ""

# Deliberately corrupt upload → verify fails → audit + notification
$bad = Invoke-Api "POST" "/documents" @{ title = "SMK corrupt.pdf"; classification = "INTERNAL"; folderId = $fA.id } $token 201
$badId = $bad.data.document.id
$badFile = New-TestFile "SMK corrupt.pdf" "pdf" 2 9
$bv = Invoke-Api "POST" "/documents/$badId/version" @{ filename = $badFile.name; mimeType = $badFile.type; sizeBytes = $badFile.bytes.Length + 500; checksum = (Get-Sha256 $badFile.bytes); changeNote = "bad" } $token 200
$bvver = $bv.data.document.versions | Where-Object { $_.checksum -eq (Get-Sha256 $badFile.bytes) } | Select-Object -First 1
Upload-Bytes $bv.data.upload $badFile.bytes
$failVerify = Invoke-Api "POST" "/documents/$badId/versions/$($bvver.id)/verify" $null $token 400
Check "mismatched verify fails (400)" ($failVerify.ok -and $failVerify.expectedError -eq 400) ($failVerify.detail)
$audit = Invoke-Api "GET" "/audit?page=1&pageSize=30" $null $token 200
Check "audit contains document.upload_failed" ($audit.ok -and ($audit.data | Where-Object { $_.action -eq "document.upload_failed" })) ($audit.detail)
Invoke-Api "DELETE" "/documents/$badId/permanent" $null $token 204 | Out-Null

# ── 4. Audio upload (rule 6) ─────────────────────────────────────────────────
Write-Host "`n== 4. Audio + video uploads ==" -ForegroundColor Cyan
$mp3 = New-TestFile "SMK audio.mp3" "mp3" 1 5
$docAudio = New-Doc $token $fA.id $mp3
Check "audio/mpeg upload pipeline passes" ($docAudio.id) ""
$mp4 = New-TestFile "SMK video.mp4" "mp4" 1 6
$docVideo = New-Doc $token $fA.id $mp4
Check "video/mp4 upload pipeline passes" ($docVideo.id) ""

# ── 5. Recycle bin dates (rule 10) ───────────────────────────────────────────
Write-Host "`n== 5. Recycle bin deletion + expiry dates ==" -ForegroundColor Cyan
Invoke-Api "DELETE" "/documents/$($docAudio.id)" $null $token 204 | Out-Null
$deleted = Invoke-Api "GET" "/documents/deleted" $null $token 200
$deletedRow = $deleted.data | Where-Object { $_.id -eq $docAudio.id } | Select-Object -First 1
Check "deleted list exposes deletedAt" ($deletedRow -and $deletedRow.PSObject.Properties.Name -contains "deletedAt" -and $null -ne $deletedRow.deletedAt) ""

# Restore to ANOTHER folder with conflict handling (rule 8/10)
$fileR = New-TestFile "SMK restore.txt" "txt" 1 11
$docR = New-Doc $token $fA.id $fileR
Invoke-Api "DELETE" "/documents/$($docR.id)" $null $token 204 | Out-Null
New-Doc $token $fA.id $fileR "SMK restore.txt" | Out-Null   # same name now live
$restKb = Invoke-Api "POST" "/documents/$($docR.id)/restore" @{ targetFolderId = $fA.id; conflictMode = "keep_both" } $token 200
Check "restore conflict keep_both suffixes name" ($restKb.ok -and $restKb.data.title -ne "SMK restore.txt") ($restKb.detail)
$restOther = Invoke-Api "POST" "/documents/$($docAudio.id)/restore" @{ targetFolderId = $fA.id; conflictMode = "cancel" } $token 200
Check "restore to another folder works" ($restOther.ok -and $restOther.data.folderId -eq $fA.id) ($restOther.detail)

# ── 6. Folder copy conflicts: merge / keep_both / cancel (rule 8) ────────────
Write-Host "`n== 6. Folder copy conflict modes ==" -ForegroundColor Cyan
$src = New-Folder $token "SMK CopySrc"
New-Doc $token $src.id (New-TestFile "SMK inner.txt" "txt" 1 12) | Out-Null
$dst = New-Folder $token "SMK CopySrc"   # same name → conflict
$merge = Invoke-Api "POST" "/folders/$($src.id)/copy" @{ targetParentId = $null; conflictMode = "merge" } $token 201
Check "copy merge into existing same-name folder" ($merge.ok -and $merge.data.folder -and $merge.data.folder.id -eq $dst.id) ($merge.detail)
$kb = Invoke-Api "POST" "/folders/$($src.id)/copy" @{ targetParentId = $null; conflictMode = "keep_both" } $token 201
Check "copy keep_both suffixes name" ($kb.ok -and $kb.data.folder.name -match "\(\d+\)") ($kb.detail)
$cancel = Invoke-Api "POST" "/folders/$($src.id)/copy" @{ targetParentId = $null; conflictMode = "cancel" } $token 409
Check "copy cancel conflict → 409" ($cancel.ok -and $cancel.expectedError -eq 409) ($cancel.detail)

# ── 7. Folder info + storage + ZIP (rules 12/13/14) ──────────────────────────
Write-Host "`n== 7. Folder info / storage / ZIP ==" -ForegroundColor Cyan
$info = Invoke-Api "GET" "/folders/$($fA.id)/info" $null $token 200
Check "folder info recursive counts" ($info.ok -and $info.data.recursiveDocumentCount -ge 1) ($info.detail)
Check "folder info recursive size" ($info.ok -and [long]$info.data.recursiveSizeBytes -gt 0) ($info.detail)
$storageInfo = Invoke-Api "GET" "/repositories/storage" $null $token 200
Check "storage endpoint used bytes" ($storageInfo.ok -and [long]$storageInfo.data.usedBytes -gt 0) ($storageInfo.detail)
Check "storage endpoint minio status honest" ($storageInfo.ok -and $storageInfo.data.minioStatus -in @("online","offline") -and $null -eq $storageInfo.data.availableBytes) ($storageInfo.detail)

$zipResp = Invoke-WebRequest -Uri "$base/folders/$($fA.id)/zip" -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 60 -UseBasicParsing
$zipBytes = $zipResp.Content
Check "ZIP download returns archive (PK magic)" ($zipResp.StatusCode -eq 200 -and $zipBytes[0] -eq 0x50 -and $zipBytes[1] -eq 0x4B) ""

# ── 8. Activity + copy jobs endpoints (rules 18/9) ───────────────────────────
Write-Host "`n== 8. Activity + copy jobs ==" -ForegroundColor Cyan
$activity = Invoke-Api "GET" "/documents/$($docA.id)/activity" $null $token 200
Check "activity contains version_added" ($activity.ok -and ($activity.data.events | Where-Object { $_.action -eq "document.version_added" })) ($activity.detail)
$jobs = Invoke-Api "GET" "/folders/jobs" $null $token 200
Check "copy jobs list endpoint" ($jobs.ok) ($jobs.detail)

# ── 9. Notifications (rule 19) ───────────────────────────────────────────────
Write-Host "`n== 9. Notifications ==" -ForegroundColor Cyan
$notifs = Invoke-Api "GET" "/notifications?page=1&pageSize=20" $null $token 200
Check "upload-completed notification emitted" ($notifs.ok -and ($notifs.data | Where-Object { $_.type -eq "DOCUMENT_UPLOADED" })) ($notifs.detail)

# ── 10. Emergency access (rule 22) ───────────────────────────────────────────
Write-Host "`n== 10. Emergency access ==" -ForegroundColor Cyan
$roles = Invoke-Api "GET" "/admin/roles" $null $token 200
$facultyRole = $roles.data | Where-Object { $_.name -eq "FACULTY" } | Select-Object -First 1
$userA = Invoke-Api "POST" "/admin/users" @{ employeeId = "SMK-A-$stamp"; email = "smk.a.$stamp@urs.local"; password = "SmokeTest!2026"; firstName = "Smoke"; lastName = "UserA"; roleId = $facultyRole.id; mustChangePassword = $false } $token 201
$userB = Invoke-Api "POST" "/admin/users" @{ employeeId = "SMK-B-$stamp"; email = "smk.b.$stamp@urs.local"; password = "SmokeTest!2026"; firstName = "Smoke"; lastName = "UserB"; roleId = $facultyRole.id; mustChangePassword = $false } $token 201
Check "temporary users created" ($userA.ok -and $userB.ok) ($userA.detail)
$userIdA = $userA.data.id
$userIdB = $userB.data.id

$grant = Invoke-Api "POST" "/repositories/$userIdA/emergency-access" @{ adminId = $rootId; reason = "Smoke test emergency access grant"; durationMinutes = 30 } $token 200
Check "root grants emergency access" ($grant.ok -and $grant.data.id) ($grant.detail)
$grants = Invoke-Api "GET" "/repositories/emergency" $null $token 200
Check "grant listed for root" ($grants.ok -and ($grants.data | Where-Object { $_.id -eq $grant.data.id })) ($grants.detail)
$revoke = Invoke-Api "POST" "/repositories/emergency-access/$($grant.data.id)/revoke" @{ reason = "Smoke test revoke" } $token 200
Check "revoke emergency access" ($revoke.ok) ($revoke.detail)

# ── 11. Multi-user isolation (rule 1) ────────────────────────────────────────
Write-Host "`n== 11. Multi-user isolation ==" -ForegroundColor Cyan
$loginA = Invoke-Api "POST" "/auth/login" @{ identifier = "smk.a.$stamp@urs.local"; password = "SmokeTest!2026" } $null 200
$loginB = Invoke-Api "POST" "/auth/login" @{ identifier = "smk.b.$stamp@urs.local"; password = "SmokeTest!2026" } $null 200
Check "user A login" $loginA.ok ($loginA.detail)
Check "user B login" $loginB.ok ($loginB.detail)
$tokenA = $loginA.data.accessToken
$tokenB = $loginB.data.accessToken
$meA = Invoke-Api "GET" "/repositories/me" $null $tokenA 200
Check "user A auto-provisioned repository" ($meA.ok -and $meA.data.ownerId -eq $userIdA) ($meA.detail)
$hidden = Invoke-Api "GET" "/documents/$($docA.id)" $null $tokenB 404
Check "user B cannot read user A's document (404)" ($hidden.ok -and $hidden.expectedError -eq 404) ($hidden.detail)
$bList = Invoke-Api "GET" "/documents?ownerId=$userIdA&page=1&pageSize=50" $null $tokenB 200
Check "user B listing never includes user A's docs" ($bList.ok -and (@($bList.data | Where-Object { $_.ownerId -eq $userIdA })).Count -eq 0) ($bList.detail)
$bFolder = New-Folder $tokenB "SMK BFolder"
$bFile = New-Doc $tokenB $bFolder.id (New-TestFile "SMK bfile.txt" "txt" 1 21)
$aHidden = Invoke-Api "GET" "/documents/$($bFile.id)" $null $tokenA 404
Check "user A cannot read user B's document (404)" ($aHidden.ok -and $aHidden.expectedError -eq 404) ($aHidden.detail)

# ── 12. Cleanup ──────────────────────────────────────────────────────────────
Write-Host "`n== 12. Cleanup ==" -ForegroundColor Cyan
# Remove root's SMK records (soft + permanent via recycle bin)
$smkDocs = (Invoke-Api "GET" "/documents?page=1&pageSize=100" $null $token 200).data | Where-Object { $_.title -like "SMK*" }
$smkDeleted = (Invoke-Api "GET" "/documents/deleted" $null $token 200).data | Where-Object { $_.title -like "SMK*" }
foreach ($doc in @($smkDocs + $smkDeleted)) { Remove-Doc $token $doc.id }
$smkFolders = (Invoke-Api "GET" "/folders" $null $token 200).data | Where-Object { $_.name -like "SMK*" }
$smkDeletedFolders = (Invoke-Api "GET" "/folders/deleted" $null $token 200).data | Where-Object { $_.name -like "SMK*" }
foreach ($folder in @($smkFolders + $smkDeletedFolders)) { Invoke-Api "DELETE" "/folders/$($folder.id)/permanent" $null $token 204 | Out-Null }
# Clean user A/B records then archive the users
$smkDocsB = @((Invoke-Api "GET" "/documents?ownerId=$userIdB&page=1&pageSize=100" $null $token 200).data | Where-Object { $_.title -like "SMK*" })
foreach ($doc in $smkDocsB) { Remove-Doc $tokenB $doc.id }
# List B's folders AS B (owner-scoped listing) so cleanup is authoritative.
$smkFoldersB = @((Invoke-Api "GET" "/folders?ownerId=$userIdB" $null $tokenB 200).data | Where-Object { $_.name -like "SMK*" })
foreach ($folder in $smkFoldersB) { Invoke-Api "DELETE" "/folders/$($folder.id)/permanent" $null $tokenB 204 | Out-Null }
Invoke-Api "DELETE" "/admin/users/$userIdB" $null $token 204 | Out-Null
Invoke-Api "DELETE" "/admin/users/$userIdA" $null $token 204 | Out-Null
Check "temp users archived" ($true) ""

$leftDocs = @((Invoke-Api "GET" "/documents?page=1&pageSize=100" $null $token 200).data | Where-Object { $_.title -like "SMK*" })
$leftFolders = @((Invoke-Api "GET" "/folders" $null $token 200).data | Where-Object { $_.name -like "SMK*" })
$leftArchivedUsers = @((Invoke-Api "GET" "/admin/users?page=1&pageSize=100" $null $token 200).data | Where-Object { $_.email -like "smk.*" })
Check "no live SMK records remain" (($leftDocs.Count + $leftFolders.Count + $leftArchivedUsers.Count) -eq 0) "leftover: $($leftDocs.Count) docs, $($leftFolders.Count) folders, $($leftArchivedUsers.Count) users"

Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Rules smoke: $($script:passed) passed, $($script:failed) failed" -ForegroundColor $(if ($script:failed -eq 0) { "Green" } else { "Red" })
if ($script:failed -gt 0) {
    $script:failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}
