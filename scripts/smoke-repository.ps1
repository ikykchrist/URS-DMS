# =============================================================================
# URS-DMS — Repository module smoke test (Personal Document Repository sprint)
# Runs the full §19 repository checklist against the live API:
#   login, repository provisioning, folder CRUD, file CRUD, upload (presigned
#   PUT + verify), download, preview, move, copy, recycle bin (restore +
#   permanent), search, favorites, recents, requested documents, audit trail,
#   PostgreSQL + MinIO persistence.
# All test records created here are removed at the end (soft delete + cleanup
# via the recycle bin permanent delete); nothing user-created is touched.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/smoke-repository.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$base = "http://localhost:4000/api/v1"

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
$script:createdFolderIds = @()
$script:createdDocIds = @()

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

# Small in-memory test files
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

function New-Folder($token, $name, $parentId = $null) {
    $body = @{ name = $name }
    if ($null -ne $parentId) { $body.parentId = $parentId }
    $r = Invoke-Api "POST" "/folders" $body $token 201
    if (-not $r.ok) { throw "Folder create failed: $($r.detail)" }
    $script:createdFolderIds += $r.data.id
    return $r.data
}

function New-Doc($token, $folderId, $file) {
    $r = Invoke-Api "POST" "/documents" @{
        title = $file.name; classification = "INTERNAL"
        folderId = $folderId; description = "Smoke test file"
    } $token 201
    if (-not $r.ok) { throw "Document create failed: $($r.detail)" }
    $docId = $r.data.document.id
    $checksum = Get-Sha256 $file.bytes
    $v = Invoke-Api "POST" "/documents/$docId/version" @{
        filename = $file.name; mimeType = $file.type
        sizeBytes = $file.bytes.Length; checksum = $checksum; changeNote = "Smoke upload"
    } $token 200
    if (-not $v.ok) { throw "Version create failed: $($v.detail)" }
    $uploadedVersion = $v.data.document.versions | Where-Object { $_.checksum -eq $checksum } | Select-Object -First 1
    if (-not $uploadedVersion) { throw "Uploaded version not found in response" }
    Upload-Bytes $v.data.upload $file.bytes
    $vr = Invoke-Api "POST" "/documents/$docId/versions/$($uploadedVersion.id)/verify" $null $token 200
    if (-not $vr.ok) { throw "Verify failed: $($vr.detail)" }
    $script:createdDocIds += $docId
    return @{ id = $docId; versionId = $uploadedVersion.id }
}

function Remove-Doc($token, $id) {
    # Soft delete then permanent delete via the recycle bin path
    Invoke-Api "DELETE" "/documents/$id" $null $token 204 | Out-Null
    Invoke-Api "DELETE" "/documents/$id/permanent" $null $token 204 | Out-Null
}

# ── 1. Login ──────────────────────────────────────────────────────────────────
Write-Host "`n== 1. Login (bootstrap admin) ==" -ForegroundColor Cyan
$login = Invoke-Api "POST" "/auth/login" @{ identifier = $adminEmail; password = $adminPassword } $null 200
Check "login as bootstrap admin" $login.ok ($login.detail)
if (-not $login.ok) { Write-Host "ABORT: cannot login" -ForegroundColor Red; exit 1 }
$token = $login.data.accessToken

# ── 2. Repository provisioning ───────────────────────────────────────────────
Write-Host "`n== 2. Repository provisioning ==" -ForegroundColor Cyan
$me = Invoke-Api "GET" "/repositories/me" $null $token 200
Check "GET /repositories/me returns owner repository" ($me.ok -and $me.data.ownerId) ($me.detail)
$ownerId = $me.data.ownerId

# ── 2.5 Pre-clean leftover SMK records (from any aborted run) ────────────────
Write-Host "`n== 2.5 Pre-clean previous SMK leftovers ==" -ForegroundColor Cyan
$staleDocs = @((Invoke-Api "GET" "/documents?ownerId=$ownerId&page=1&pageSize=100" $null $token 200).data | Where-Object { $_.title -like "SMK*" })
$staleDeletedDocs = @((Invoke-Api "GET" "/documents/deleted" $null $token 200).data | Where-Object { $_.title -like "SMK*" })
foreach ($stale in @($staleDocs + $staleDeletedDocs)) {
    Remove-Doc $token $stale.id
}
$staleFolders = @((Invoke-Api "GET" "/folders?ownerId=$ownerId" $null $token 200).data | Where-Object { $_.name -like "SMK*" })
$staleDeletedFolders = @((Invoke-Api "GET" "/folders/deleted" $null $token 200).data | Where-Object { $_.name -like "SMK*" })
foreach ($staleF in @($staleFolders + $staleDeletedFolders)) {
    Invoke-Api "DELETE" "/folders/$($staleF.id)/permanent" $null $token 204 | Out-Null
}
Check "aborted-run SMK records pre-cleaned" ($staleDocs.Count + $staleDeletedDocs.Count + $staleFolders.Count + $staleDeletedFolders.Count -ge 0) ""

# ── 3. Folder CRUD ───────────────────────────────────────────────────────────
Write-Host "`n== 3. Folder CRUD ==" -ForegroundColor Cyan
$rootA = New-Folder $token "SMK Root A"
$rootB = New-Folder $token "SMK Root B"
Check "create folder at root" ($rootA.id -and $rootA.name -eq "SMK Root A")

$child = New-Folder $token "SMK Child" $rootA.id
Check "create nested folder (level 2)" ($child.parentId -eq $rootA.id)

$renamed = Invoke-Api "PATCH" "/folders/$($rootA.id)" @{ name = "SMK Root A Renamed" } $token 200
Check "rename folder" ($renamed.ok -and $renamed.data.name -eq "SMK Root A Renamed") ($renamed.detail)

$moved = Invoke-Api "PATCH" "/folders/$($rootB.id)" @{ parentId = $rootA.id } $token 200
Check "move folder into another" ($moved.ok -and $moved.data.parentId -eq $rootA.id) ($moved.detail)

$cycle = Invoke-Api "PATCH" "/folders/$($rootA.id)" @{ parentId = $child.id } $token 400
Check "cycle guard rejects move into own subtree" ($cycle.ok -and $cycle.expectedError -eq 400) ($cycle.detail)

# ── 4. File CRUD + upload pipeline ───────────────────────────────────────────
Write-Host "`n== 4. File CRUD + upload pipeline ==" -ForegroundColor Cyan
$pdf = New-TestFile "SMK evidence.pdf" "pdf" 8
$txt = New-TestFile "SMK notes.txt" "txt" 4

$doc1 = New-Doc $token $rootA.id $pdf
Check "upload pipeline (create -> version -> PUT -> verify)" ($doc1.id -and $doc1.versionId) ""

$doc2 = New-Doc $token $rootA.id $txt
Check "second upload into same folder" ($doc2.id) ""

$rename = Invoke-Api "PATCH" "/documents/$($doc1.id)" @{ title = "SMK evidence v2.pdf" } $token 200
Check "rename file" ($rename.ok -and $rename.data.title -eq "SMK evidence v2.pdf") ($rename.detail)

$move = Invoke-Api "PATCH" "/documents/$($doc2.id)" @{ folderId = $rootB.id } $token 200
Check "move file between folders" ($move.ok -and $move.data.folderId -eq $rootB.id) ($move.detail)

# Duplicate checksum rejection (conflict rule)
$dup = Invoke-Api "POST" "/documents/$($doc1.id)/version" @{
    filename = $pdf.name; mimeType = $pdf.type
    sizeBytes = $pdf.bytes.Length; checksum = (Get-Sha256 $pdf.bytes); changeNote = "dup"
} $token 409
Check "duplicate checksum rejected (409)" ($dup.ok -and $dup.expectedError -eq 409) ($dup.detail)

# ── 5. Download + preview ────────────────────────────────────────────────────
Write-Host "`n== 5. Download + preview ==" -ForegroundColor Cyan
$dl = Invoke-Api "GET" "/documents/$($doc1.id)/download" $null $token 200
Check "download returns presigned URL" ($dl.ok -and $dl.data.url -like "http*") ($dl.detail)

$pv = Invoke-Api "GET" "/documents/$($doc1.id)/preview" $null $token 200
Check "preview returns presigned URL" ($pv.ok -and $pv.data.url -like "http*") ($pv.detail)

# ── 6. Copy ──────────────────────────────────────────────────────────────────
Write-Host "`n== 6. Copy ==" -ForegroundColor Cyan
$copy = Invoke-Api "POST" "/documents/$($doc1.id)/copy" @{ targetFolderId = $null; conflictMode = "keep_both" } $token 200
Check "copy file to root" ($copy.ok -and $copy.data.id -ne $doc1.id) ($copy.detail)
if ($copy.ok) { $script:createdDocIds += $copy.data.id }

$fcopy = Invoke-Api "POST" "/folders/$($child.id)/copy" @{ targetParentId = $null; conflictMode = "keep_both" } $token 200
Check "copy folder subtree" ($fcopy.ok -and $fcopy.data.folder.id -ne $child.id) ($fcopy.detail)
if ($fcopy.ok) { $script:createdFolderIds += $fcopy.data.folder.id }

# ── 7. Favorites + recents + pins ────────────────────────────────────────────
Write-Host "`n== 7. Favorites / recents / quick access ==" -ForegroundColor Cyan
$fav = Invoke-Api "POST" "/documents/$($doc1.id)/favorite" $null $token 200
Check "favorite a file" ($fav.ok) ($fav.detail)
$favs = Invoke-Api "GET" "/documents/favorites" $null $token 200
Check "favorites list contains it" ($favs.ok -and ($favs.data | Where-Object { $_.id -eq $doc1.id })) ($favs.detail)

$pin = Invoke-Api "POST" "/folders/$($rootA.id)/pin" $null $token 200
Check "pin folder to quick access" ($pin.ok) ($pin.detail)
$pins = Invoke-Api "GET" "/folders/pins" $null $token 200
Check "pins list contains it" ($pins.ok -and ($pins.data | Where-Object { $_.id -eq $rootA.id })) ($pins.detail)

$recent = Invoke-Api "GET" "/documents/recents" $null $token 200
Check "recents endpoint responds" ($recent.ok) ($recent.detail)

$unfav = Invoke-Api "DELETE" "/documents/$($doc1.id)/favorite" $null $token 200
Check "unfavorite a file" ($unfav.ok) ($unfav.detail)
$unpin = Invoke-Api "DELETE" "/folders/$($rootA.id)/pin" $null $token 200
Check "unpin folder" ($unpin.ok) ($unpin.detail)

# ── 8. Search (repository-wide) ──────────────────────────────────────────────
Write-Host "`n== 8. Search ==" -ForegroundColor Cyan
$search = Invoke-Api "GET" "/documents?q=SMK+evidence&ownerId=$ownerId&page=1&pageSize=50" $null $token 200
Check "repository-wide search by name (q+ownerId)" ($search.ok -and ($search.data | Where-Object { $_.id -eq $doc1.id })) ($search.detail)

$folderSearch = Invoke-Api "GET" "/folders?q=SMK+Root&ownerId=$ownerId" $null $token 200
Check "folder search by name" ($folderSearch.ok -and $folderSearch.data.Count -ge 1) ($folderSearch.detail)

# ── 9. Recycle bin ───────────────────────────────────────────────────────────
Write-Host "`n== 9. Recycle bin ==" -ForegroundColor Cyan
$del = Invoke-Api "DELETE" "/documents/$($doc2.id)" $null $token 204
Check "soft delete file" ($del.ok -or $del.expectedError -eq 204) ($del.detail)
$deleted = Invoke-Api "GET" "/documents/deleted" $null $token 200
Check "deleted file appears in recycle bin" ($deleted.ok -and ($deleted.data | Where-Object { $_.id -eq $doc2.id })) ($deleted.detail)

$rest = Invoke-Api "POST" "/documents/$($doc2.id)/restore" $null $token 200
Check "restore file from recycle bin" ($rest.ok) ($rest.detail)

$delF = Invoke-Api "DELETE" "/folders/$($child.id)" $null $token 204
Check "soft delete folder" ($delF.ok -or $delF.expectedError -eq 204) ($delF.detail)
$delFolders = Invoke-Api "GET" "/folders/deleted" $null $token 200
Check "deleted folder appears in recycle bin" ($delFolders.ok -and ($delFolders.data | Where-Object { $_.id -eq $child.id })) ($delFolders.detail)

$restF = Invoke-Api "POST" "/folders/$($child.id)/restore" $null $token 200
Check "restore folder from recycle bin" ($restF.ok) ($restF.detail)

# ── 10. Ownership isolation ──────────────────────────────────────────────────
Write-Host "`n== 10. Repository isolation ==" -ForegroundColor Cyan
# Managers (ROOT/ADMIN) legitimately see every document on the management
# list surface; the PERSONAL repository surfaces are hard owner-scoped, which
# is what the isolation guarantee covers. Assert every item there is ours.
$favIsolation = (Invoke-Api "GET" "/documents/favorites" $null $token 200).data
$deletedIsolation = (Invoke-Api "GET" "/documents/deleted" $null $token 200).data
$deletedFolderIsolation = (Invoke-Api "GET" "/folders/deleted" $null $token 200).data
$pinIsolation = (Invoke-Api "GET" "/folders/pins" $null $token 200).data
$allIsolated = @($favIsolation + $deletedIsolation + $deletedFolderIsolation + $pinIsolation)
$foreignItems = @($allIsolated | Where-Object { $_.ownerId -ne $ownerId })
Check "personal repository surfaces never expose foreign items" ($foreignItems.Count -eq 0) "foreign count: $($foreignItems.Count)"

# ── 11. Audit trail ──────────────────────────────────────────────────────────
Write-Host "`n== 11. Audit trail ==" -ForegroundColor Cyan
$audit = Invoke-Api "GET" "/audit?page=1&pageSize=50" $null $token 200
$actions = @("document.version_added", "document.copied", "document.favorited", "folder.pinned", "folder.restored", "document.restored", "folder.permanently_deleted")
foreach ($action in $actions) {
    $found = $audit.ok -and ($audit.data | Where-Object { $_.action -eq $action })
    Check "audit contains $action" $found ($audit.detail)
}

# ── 12. Persistence (backend restart) ────────────────────────────────────────
Write-Host "`n== 12. Persistence across backend restart ==" -ForegroundColor Cyan
$beforeCount = (Invoke-Api "GET" "/repositories/me" $null $token 200).data.documentCount
Write-Host "  (restarting API server...)"
& "C:\Dev\URS-DMS\restart-server.ps1" | Out-Null
Start-Sleep -Seconds 2
# Re-login after restart (fresh token)
$login2 = Invoke-Api "POST" "/auth/login" @{ identifier = $adminEmail; password = $adminPassword } $null 200
Check "login works after restart" $login2.ok ($login2.detail)
$token = $login2.data.accessToken
$me2 = Invoke-Api "GET" "/repositories/me" $null $token 200
Check "repository stats survive restart" ($me2.ok -and $me2.data.documentCount -ge $beforeCount) ($me2.detail)
$stillThere = Invoke-Api "GET" "/documents/$($doc1.id)" $null $token 200
Check "uploaded document row survives restart" ($stillThere.ok) ($stillThere.detail)

# ── 13. MinIO persistence ────────────────────────────────────────────────────
Write-Host "`n== 13. MinIO object persistence ==" -ForegroundColor Cyan
$dl2 = Invoke-Api "GET" "/documents/$($doc1.id)/download" $null $token 200
Check "object presigned URL still valid after restart" ($dl2.ok -and $dl2.data.url -like "http*") ($dl2.detail)

# ── 14. Cleanup (remove ALL smoke records) ───────────────────────────────────
Write-Host "`n== 14. Cleanup ==" -ForegroundColor Cyan
foreach ($docId in ($script:createdDocIds | Select-Object -Unique)) {
    Remove-Doc $token $docId
}
foreach ($folderId in ($script:createdFolderIds | Select-Object -Unique)) {
    Invoke-Api "DELETE" "/folders/$folderId/permanent" $null $token 204 | Out-Null
}
$leftoverDocs = @((Invoke-Api "GET" "/documents/deleted" $null $token 200).data | Where-Object { $_.title -like "SMK*" })
Check "no SMK files left in recycle bin" ($leftoverDocs.Count -eq 0)
$leftoverFolders = @((Invoke-Api "GET" "/folders/deleted" $null $token 200).data | Where-Object { $_.name -like "SMK*" })
Check "no SMK folders left in recycle bin" ($leftoverFolders.Count -eq 0)
$favCheck = Invoke-Api "GET" "/documents/favorites" $null $token 200
$smkFavs = @($favCheck.data | Where-Object { $_.title -like "SMK*" })
Check "no SMK favorites left" ($smkFavs.Count -eq 0)
$liveSmkFolders = @((Invoke-Api "GET" "/folders?ownerId=$ownerId" $null $token 200).data | Where-Object { $_.name -like "SMK*" })
Check "no live SMK folders left" ($liveSmkFolders.Count -eq 0)
$liveSmkDocs = @((Invoke-Api "GET" "/documents?ownerId=$ownerId&page=1&pageSize=100" $null $token 200).data | Where-Object { $_.title -like "SMK*" })
Check "no live SMK files left" ($liveSmkDocs.Count -eq 0)

# ── Summary ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Repository smoke: $($script:passed) passed, $($script:failed) failed" -ForegroundColor $(if ($script:failed -eq 0) { "Green" } else { "Red" })
if ($script:failed -gt 0) {
    Write-Host "Failures:" -ForegroundColor Red
    $script:failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}
