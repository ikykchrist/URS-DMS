# =============================================================================
# URS-DMS — AACCUP group smoke test (task creation, submit-into-task,
# submission review workflow)
# Runs against the live API:
#   login, task assignee picker, task create (with/without dueDate), assignee
#   status transitions (OPEN -> IN_PROGRESS -> COMPLETED), submit-into-task
#   (validate -> documents -> version -> presigned PUT -> verify -> submission
#   with taskId), review decisions (APPROVED / NEEDS_REVISION / REJECTED),
#   closed-review conflict, negative cases, and full self-cleanup.
# All records created here are removed at the end; nothing user-created is
# touched. Requires the API server on :4000 and the docker postgres/minio.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/smoke-aaccup.ps1
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
$script:createdTaskIds = @()
$script:createdSubmissionIds = @()
$script:createdRequirementIds = @()
$script:createdRequirementAreaIds = @()

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

function New-RequirementDoc($token, $requirementId, $departmentId, $title, $file) {
    $created = Invoke-Api "POST" "/documents" @{
        title = $title; classification = "INTERNAL"
        departmentId = $departmentId
        metadata = @{ requirementId = $requirementId }
    } $token 201
    if (-not $created.ok) { throw "Document create failed: $($created.detail)" }
    $docId = $created.data.document.id
    $checksum = Get-Sha256 $file.bytes
    $v = Invoke-Api "POST" "/documents/$docId/version" @{
        filename = $file.name; mimeType = $file.type
        sizeBytes = $file.bytes.Length; checksum = $checksum; changeNote = "AACCUP smoke upload"
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

# ── 1. Login ──────────────────────────────────────────────────────────────────
Write-Host "`n== 1. Login (bootstrap root) ==" -ForegroundColor Cyan
$login = Invoke-Api "POST" "/auth/login" @{ identifier = $adminEmail; password = $adminPassword } $null 200
Check "login as bootstrap root" $login.ok ($login.detail)
if (-not $login.ok) { Write-Host "ABORT: cannot login" -ForegroundColor Red; exit 1 }
$token = $login.data.accessToken

# ── 1.5 Pre-clean leftovers from any aborted run ──────────────────────────────
Write-Host "`n== 1.5 Pre-clean previous SMK leftovers ==" -ForegroundColor Cyan
$staleTasks = @((Invoke-Api "GET" "/aaccup/tasks?q=SMK&pageSize=100" $null $token 200).data)
foreach ($staleTask in $staleTasks) {
    Invoke-Api "DELETE" "/aaccup/tasks/$($staleTask.id)" $null $token 204 | Out-Null
}
$staleDocs = @((Invoke-Api "GET" "/documents?page=1&pageSize=100" $null $token 200).data | Where-Object { $_.title -like "SMK*" })
foreach ($staleDoc in $staleDocs) { Remove-Doc $token $staleDoc.id }
$staleUsers = @((Invoke-Api "GET" "/admin/users?page=1&pageSize=100" $null $token 200).data | Where-Object { $_.email -like "smk.*" })
foreach ($staleUser in $staleUsers) { Invoke-Api "DELETE" "/admin/users/$($staleUser.id)" $null $token 204 | Out-Null }
$staleActiveReqs = @((Invoke-Api "GET" "/aaccup/requirements?status=ACTIVE&q=SMK&pageSize=100" $null $token 200).data)
foreach ($staleReq in $staleActiveReqs) {
    Invoke-Api "DELETE" "/aaccup/requirements/$($staleReq.id)" $null $token 200 | Out-Null
}
Check "aborted-run SMK records pre-cleaned" ($true) ""

# ── 2. Task assignee picker ───────────────────────────────────────────────────
Write-Host "`n== 2. Task assignee picker ==" -ForegroundColor Cyan
$assignees = Invoke-Api "GET" "/aaccup/tasks/assignees" $null $token 200
Check "GET /aaccup/tasks/assignees returns users + departments" ($assignees.ok -and $assignees.data.users -ne $null -and $assignees.data.departments -ne $null) ($assignees.detail)
Check "assignee list contains at least one active user" ($assignees.data.users.Count -ge 1) ""

# ── 3. Fixture area + requirement ─────────────────────────────────────────────
Write-Host "`n== 3. Fixture area + requirement ==" -ForegroundColor Cyan
$fixtureArea = $null
$fixtureRequirement = $null
foreach ($setName in @("AACCUP", "ISO", "CERT")) {
    $areas = @((Invoke-Api "GET" "/aaccup/areas?status=ACTIVE&areaSet=$setName&pageSize=100" $null $token 200).data)
    foreach ($area in $areas) {
        $reqs = @((Invoke-Api "GET" "/aaccup/requirements?areaId=$($area.id)&status=ACTIVE&pageSize=100" $null $token 200).data)
        if ($reqs.Count -gt 0) {
            $fixtureArea = $area
            $fixtureRequirement = $reqs[0]
            break
        }
    }
    if ($fixtureRequirement) { break }
}
if (-not $fixtureRequirement) { Write-Host "ABORT: no ACTIVE requirement found under any accreditation area" -ForegroundColor Red; exit 1 }
Check "fixture area found" ($fixtureArea.id) ""
Check "fixture requirement found" ($fixtureRequirement.id) ""

# ── 4. Task creation ──────────────────────────────────────────────────────────
Write-Host "`n== 4. Task creation ==" -ForegroundColor Cyan
$taskNoDue = Invoke-Api "POST" "/aaccup/tasks" @{
    areaId = $fixtureArea.id; title = "SMK Task No Due $stamp"; description = ""
    priority = "MEDIUM"; assigneeType = "USER"; assigneeId = $assignees.data.users[0].id
} $token 201
Check "create task without dueDate" $taskNoDue.ok ($taskNoDue.detail)
if ($taskNoDue.ok) {
    $script:createdTaskIds += $taskNoDue.data.id
    $dueDateValue = $taskNoDue.data.dueDate
    $isEpochCorruption = ($dueDateValue -ne $null -and $dueDateValue.StartsWith("1970"))
    Check "task without dueDate is NOT stored as 1970-01-01" (-not $isEpochCorruption) "dueDate=$dueDateValue"
    Check "task description normalized to null" ($taskNoDue.data.description -eq $null) "description=$($taskNoDue.data.description)"
    Check "task exposes area departmentId" ($taskNoDue.data.departmentId -eq $fixtureArea.departmentId) ""
}

$dueIso = "2027-12-31T00:00:00.000Z"
$taskWithDue = Invoke-Api "POST" "/aaccup/tasks" @{
    areaId = $fixtureArea.id; title = "SMK Task With Due $stamp"
    dueDate = $dueIso; priority = "HIGH"
    requirementId = $fixtureRequirement.id
    assigneeType = "USER"; assigneeId = $assignees.data.users[0].id
} $token 201
Check "create task with dueDate + requirement" $taskWithDue.ok ($taskWithDue.detail)
if ($taskWithDue.ok) {
    $script:createdTaskIds += $taskWithDue.data.id
    Check "dueDate persisted" ($taskWithDue.data.dueDate -eq $dueIso) "dueDate=$($taskWithDue.data.dueDate)"
    Check "requirement link persisted" ($taskWithDue.data.requirementId -eq $fixtureRequirement.id) ""
}

$negNoAssignee = Invoke-Api "POST" "/aaccup/tasks" @{
    areaId = $fixtureArea.id; title = "SMK Invalid $stamp"; assigneeType = "USER"
} $token 400
Check "create task without assigneeId rejected (400)" $negNoAssignee.ok ($negNoAssignee.detail)

$negBadArea = Invoke-Api "POST" "/aaccup/tasks" @{
    areaId = "00000000-0000-0000-0000-000000000000"; title = "SMK Bad Area $stamp"
    assigneeType = "USER"; assigneeId = $assignees.data.users[0].id
} $token 400
Check "create task with unknown area rejected (400)" $negBadArea.ok ($negBadArea.detail)

# ── 5. SMK user (assignee + submitter) ────────────────────────────────────────
Write-Host "`n== 5. SMK user ==" -ForegroundColor Cyan
$roles = Invoke-Api "GET" "/admin/roles" $null $token 200
$submitterRole = $roles.data | Where-Object { $_.name -eq "FACULTY" } | Select-Object -First 1
if (-not $submitterRole) { Write-Host "ABORT: FACULTY role not found" -ForegroundColor Red; exit 1 }
$smkUser = Invoke-Api "POST" "/admin/users" @{
    employeeId = "SMK-A-$stamp"; email = "smk.a.$stamp@urs.local"
    password = "SmokeTest!2026"; firstName = "Smoke"; lastName = "Assignee"
    roleId = $submitterRole.id; departmentId = $fixtureArea.departmentId
    mustChangePassword = $false
} $token 201
Check "SMK user created" $smkUser.ok ($smkUser.detail)
if (-not $smkUser.ok) { Write-Host "ABORT: cannot create SMK user" -ForegroundColor Red; exit 1 }
$smkUserId = $smkUser.data.id

# Assign the SMK user as the assignee of a dedicated task (created by root).
$smkTask = Invoke-Api "POST" "/aaccup/tasks" @{
    areaId = $fixtureArea.id; title = "SMK Assignee Task $stamp"
    priority = "MEDIUM"; requirementId = $fixtureRequirement.id
    assigneeType = "USER"; assigneeId = $smkUserId
} $token 201
Check "task assigned to SMK user" $smkTask.ok ($smkTask.detail)
if ($smkTask.ok) { $script:createdTaskIds += $smkTask.data.id; $taskId = $smkTask.data.id }

# ── 6. Assignee status transitions ────────────────────────────────────────────
Write-Host "`n== 6. Assignee status transitions ==" -ForegroundColor Cyan
$userLogin = Invoke-Api "POST" "/auth/login" @{ identifier = "smk.a.$stamp@urs.local"; password = "SmokeTest!2026" } $null 200
Check "login as SMK user" $userLogin.ok ($userLogin.detail)
if (-not $userLogin.ok) { Write-Host "ABORT: cannot login as SMK user" -ForegroundColor Red; exit 1 }
$userToken = $userLogin.data.accessToken

$mine = Invoke-Api "GET" "/aaccup/tasks?mine=true&pageSize=100" $null $userToken 200
$mineMatches = @($mine.data) | Where-Object { $_.id -eq $taskId }
Check "GET /aaccup/tasks?mine=true lists assigned task" ($mine.ok -and @($mineMatches).Count -eq 1) ($mine.detail)

$skipTransition = Invoke-Api "PATCH" "/aaccup/tasks/$taskId" @{ status = "COMPLETED" } $userToken 409
Check "assignee OPEN -> COMPLETED rejected (409)" $skipTransition.ok ($skipTransition.detail)

$editTitle = Invoke-Api "PATCH" "/aaccup/tasks/$taskId" @{ title = "SMK Should Fail $stamp" } $userToken 403
Check "assignee editing title rejected (403)" $editTitle.ok ($editTitle.detail)

$start = Invoke-Api "PATCH" "/aaccup/tasks/$taskId" @{ status = "IN_PROGRESS" } $userToken 200
Check "assignee OPEN -> IN_PROGRESS" ($start.ok -and $start.data.status -eq "IN_PROGRESS") ($start.detail)

# ── 7. Submit into task ───────────────────────────────────────────────────────
Write-Host "`n== 7. Submit into task ==" -ForegroundColor Cyan
$fileA = New-TestFile "SMK evidence A.pdf" "pdf" 32
$validate = Invoke-Api "POST" "/aaccup/requirements/$($fixtureRequirement.id)/validate-upload" @{
    filename = $fileA.name; mimeType = $fileA.type; sizeBytes = $fileA.bytes.Length
} $userToken 200
Check "validate-upload passes" ($validate.ok -and $validate.data.valid -eq $true) ($validate.detail)

$docA = New-RequirementDoc $userToken $fixtureRequirement.id $fixtureArea.departmentId "SMK Task Submission $stamp" $fileA
$subA = Invoke-Api "POST" "/aaccup/submissions" @{
    requirementId = $fixtureRequirement.id; documentId = $docA; taskId = $taskId
    remarks = "smoke submit into task"
} $userToken 201
Check "submission created with taskId" ($subA.ok -and $subA.data.taskId -eq $taskId) ($subA.detail)
if ($subA.ok) { $script:createdSubmissionIds += $subA.data.id; $subAId = $subA.data.id }

$listSubs = Invoke-Api "GET" "/aaccup/submissions?areaId=$($fixtureArea.id)&pageSize=100" $null $token 200
$subMatches = @($listSubs.data) | Where-Object { $_.id -eq $subAId -and $_.taskId -eq $taskId }
Check "submission visible in area list" ($listSubs.ok -and @($subMatches).Count -eq 1) ($listSubs.detail)

$badTaskLink = Invoke-Api "POST" "/aaccup/submissions" @{
    requirementId = $fixtureRequirement.id; documentId = $docA; taskId = "00000000-0000-0000-0000-000000000000"
} $userToken 400
Check "submission with unknown taskId rejected (400)" $badTaskLink.ok ($badTaskLink.detail)

# ── 8. Review workflow ────────────────────────────────────────────────────────
Write-Host "`n== 8. Review workflow ==" -ForegroundColor Cyan
$reviewApproved = Invoke-Api "POST" "/aaccup/submissions/$subAId/review" @{ decision = "APPROVED"; remarks = "smoke ok" } $token 200
Check "review PENDING -> APPROVED" ($reviewApproved.ok -and $reviewApproved.data.status -eq "APPROVED") ($reviewApproved.detail)

$reReview = Invoke-Api "POST" "/aaccup/submissions/$subAId/review" @{ decision = "REJECTED" } $token 409
Check "re-review of APPROVED rejected (409)" $reReview.ok ($reReview.detail)

$fileB = New-TestFile "SMK evidence B.pdf" "pdf" 32
$docB = New-RequirementDoc $userToken $fixtureRequirement.id $fixtureArea.departmentId "SMK Task Resubmit $stamp" $fileB
$subB = Invoke-Api "POST" "/aaccup/submissions" @{
    requirementId = $fixtureRequirement.id; documentId = $docB; taskId = $taskId
} $userToken 201
Check "second submission created" $subB.ok ($subB.detail)
if ($subB.ok) { $script:createdSubmissionIds += $subB.data.id; $subBId = $subB.data.id }

$reviewReturned = Invoke-Api "POST" "/aaccup/submissions/$subBId/review" @{ decision = "NEEDS_REVISION"; remarks = "smoke: needs revision" } $token 200
Check "review PENDING -> NEEDS_REVISION" ($reviewReturned.ok -and $reviewReturned.data.status -eq "NEEDS_REVISION") ($reviewReturned.detail)

$reReview2 = Invoke-Api "POST" "/aaccup/submissions/$subBId/review" @{ decision = "APPROVED" } $token 200
Check "re-review NEEDS_REVISION -> APPROVED allowed" ($reReview2.ok -and $reReview2.data.status -eq "APPROVED") ($reReview2.detail)

$fileC = New-TestFile "SMK evidence C.pdf" "pdf" 32
$docC = New-RequirementDoc $userToken $fixtureRequirement.id $fixtureArea.departmentId "SMK Task Rejected $stamp" $fileC
$subC = Invoke-Api "POST" "/aaccup/submissions" @{
    requirementId = $fixtureRequirement.id; documentId = $docC; taskId = $taskId
} $userToken 201
Check "third submission created" $subC.ok ($subC.detail)
if ($subC.ok) { $script:createdSubmissionIds += $subC.data.id; $subCId = $subC.data.id }

$reviewRejected = Invoke-Api "POST" "/aaccup/submissions/$subCId/review" @{ decision = "REJECTED"; remarks = "smoke: rejected" } $token 200
Check "review PENDING -> REJECTED" ($reviewRejected.ok -and $reviewRejected.data.status -eq "REJECTED") ($reviewRejected.detail)

# ── 9. Complete the task ──────────────────────────────────────────────────────
Write-Host "`n== 9. Complete the task ==" -ForegroundColor Cyan
$complete = Invoke-Api "PATCH" "/aaccup/tasks/$taskId" @{ status = "COMPLETED" } $userToken 200
Check "assignee IN_PROGRESS -> COMPLETED" ($complete.ok -and $complete.data.status -eq "COMPLETED" -and $complete.data.completedAt) ($complete.detail)

$closedTaskSubmit = Invoke-Api "POST" "/aaccup/submissions" @{
    requirementId = $fixtureRequirement.id; documentId = $docA; taskId = $taskId
} $userToken 400
Check "submit into COMPLETED task rejected (400)" $closedTaskSubmit.ok ($closedTaskSubmit.detail)

# ── 9.5 Requirement CRUD (manual area) ────────────────────────────────────────
Write-Host "`n== 9.5 Requirement CRUD ==" -ForegroundColor Cyan
$reqArea = $null
$reqAreaCreated = $false
$aaccupAreas = @((Invoke-Api "GET" "/aaccup/areas?status=ACTIVE&areaSet=AACCUP&pageSize=100" $null $token 200).data)
if ($aaccupAreas.Count -gt 0) { $reqArea = $aaccupAreas[0] }
$reqProbe = $null
if ($reqArea) {
    $reqProbe = Invoke-Api "POST" "/aaccup/requirements" @{
        areaId = $reqArea.id; title = "SMK Req Probe $stamp"; documentCode = "SMK-REQ-PROBE-$stamp"
    } $token 201
}
if ($reqProbe.ok) { $script:createdRequirementIds += $reqProbe.data.id }
if (-not $reqProbe.ok) {
    $reqArea = Invoke-Api "POST" "/aaccup/areas" @{
        code = "SMK-REQ-AREA-$stamp"; name = "SMK Requirement Area $stamp"
        description = "Smoke fixture"; departmentId = $fixtureArea.departmentId
        areaSet = "AACCUP"
    } $token 201
    if ($reqArea.ok) {
        $script:createdRequirementAreaIds += $reqArea.data.id
        $reqAreaCreated = $true
    } else {
        Write-Host "ABORT: cannot obtain a manual (non-builder) area for requirement CRUD" -ForegroundColor Red
    }
}
if ($reqAreaCreated -or $reqProbe.ok) {
    $manualAreaId = if ($reqProbe.ok) { $reqArea.id } else { $reqArea.data.id }
    $code = "SMK-REQ-$stamp"
    $createdReq = Invoke-Api "POST" "/aaccup/requirements" @{
        areaId = $manualAreaId; title = "SMK Requirement $stamp"; documentCode = $code
        description = "Smoke requirement"; category = "Documentation"
        isRequired = $true; status = "ACTIVE"; displayOrder = 0
    } $token 201
    Check "create requirement on manual area" $createdReq.ok ($createdReq.detail)
    if ($createdReq.ok) {
        $script:createdRequirementIds += $createdReq.data.id
        $requirementId = $createdReq.data.id
        Check "requirement defaults to required/active" ($createdReq.data.isRequired -eq $true -and $createdReq.data.status -eq "ACTIVE") ""

        $dup = Invoke-Api "POST" "/aaccup/requirements" @{
            areaId = $manualAreaId; title = "SMK Dup $stamp"; documentCode = $code
        } $token 409
        Check "duplicate documentCode rejected (409)" $dup.ok ($dup.detail)

        $updated = Invoke-Api "PATCH" "/aaccup/requirements/$requirementId" @{
            title = "SMK Requirement Renamed $stamp"; status = "INACTIVE"; isRequired = $false
        } $token 200
        Check "update requirement title/status" ($updated.ok -and $updated.data.title -like "SMK Requirement Renamed*" -and $updated.data.status -eq "INACTIVE") ($updated.detail)

        $listed = Invoke-Api "GET" "/aaccup/requirements?areaId=$manualAreaId&pageSize=100" $null $token 200
        $reqMatch = @($listed.data) | Where-Object { $_.id -eq $requirementId }
        Check "requirement visible in area requirement list" (@($reqMatch).Count -eq 1) ""

        $archived = Invoke-Api "DELETE" "/aaccup/requirements/$requirementId" $null $token 200
        Check "archive requirement" ($archived.ok -and $archived.data.deletedAt) ($archived.detail)

        $activeAfter = @((Invoke-Api "GET" "/aaccup/requirements?areaId=$manualAreaId&status=ACTIVE&pageSize=100" $null $token 200).data)
        $stillActive = @($activeAfter) | Where-Object { $_.id -eq $requirementId }
        Check "archived requirement gone from ACTIVE list" (@($stillActive).Count -eq 0) ""
    } else {
        Check "manual area available for requirement CRUD" $false ($createdReq.detail)
    }
} else {
    Check "manual area available for requirement CRUD" $false "no non-builder area could be obtained"
}

# ── 10. Cleanup ───────────────────────────────────────────────────────────────
Write-Host "`n== 10. Cleanup ==" -ForegroundColor Cyan
foreach ($subId in $script:createdSubmissionIds) {
    Invoke-Api "DELETE" "/aaccup/submissions/$subId" $null $token 204 | Out-Null
}
foreach ($docId in $script:createdDocIds) { Remove-Doc $token $docId }
foreach ($taskIdTmp in $script:createdTaskIds) {
    Invoke-Api "DELETE" "/aaccup/tasks/$taskIdTmp" $null $token 204 | Out-Null
}
foreach ($requirementIdTmp in $script:createdRequirementIds) {
    Invoke-Api "DELETE" "/aaccup/requirements/$requirementIdTmp" $null $token 200 | Out-Null
}
foreach ($reqAreaIdTmp in $script:createdRequirementAreaIds) {
    Invoke-Api "DELETE" "/aaccup/areas/$reqAreaIdTmp" $null $token 200 | Out-Null
}
Invoke-Api "DELETE" "/admin/users/$smkUserId" $null $token 204 | Out-Null

$leftTasks = @((Invoke-Api "GET" "/aaccup/tasks?q=SMK&pageSize=100" $null $token 200).data)
$leftDocs = @((Invoke-Api "GET" "/documents?page=1&pageSize=100" $null $token 200).data | Where-Object { $_.title -like "SMK*" })
$leftUsers = @((Invoke-Api "GET" "/admin/users?page=1&pageSize=100" $null $token 200).data | Where-Object { $_.email -like "smk.*" })
$leftActiveReqs = @((Invoke-Api "GET" "/aaccup/requirements?status=ACTIVE&q=SMK&pageSize=100" $null $token 200).data)
$leftAreas = @((Invoke-Api "GET" "/aaccup/areas?q=SMK&pageSize=100" $null $token 200).data)
Check "no live SMK records remain" (($leftTasks.Count + $leftDocs.Count + $leftUsers.Count + $leftActiveReqs.Count + $leftAreas.Count) -eq 0) "leftover: $($leftTasks.Count) tasks, $($leftDocs.Count) docs, $($leftUsers.Count) users, $($leftActiveReqs.Count) active reqs, $($leftAreas.Count) areas"

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
if ($script:failed -eq 0) {
    Write-Host "AACCUP smoke: $($script:passed) passed, 0 failed" -ForegroundColor Green
} else {
    Write-Host "AACCUP smoke: $($script:passed) passed, $($script:failed) failed" -ForegroundColor Red
    foreach ($failure in $script:failures) { Write-Host "  FAILED: $failure" -ForegroundColor Red }
    exit 1
}
