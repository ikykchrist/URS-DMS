# URS-DMS Sprint 8.5 load test (PowerShell)
param([int]$Users = 10, [int]$Duration = 30)
$ErrorActionPreference = "Continue"
$base = "http://localhost:4000/api/v1"
$e = Get-Content "C:\Dev\URS-DMS\.env" -Raw
$re = [regex]::Match($e, "(?m)^BOOTSTRAP_ROOT_EMAIL=(.*)$").Groups[1].Value.Trim()
$rp = [regex]::Match($e, "(?m)^BOOTSTRAP_ROOT_PASSWORD=(.*)$").Groups[1].Value.Trim()
Write-Host "URS-DMS Load Test: $Users users, ${Duration}s" -ForegroundColor Cyan
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$sb = {
  param($b, $re, $rp, $d, $id)
  $o = @()
  try { $l = Invoke-RestMethod -Method POST -Uri "$b/auth/login" -ContentType "application/json" -Body (@{identifier=$re;password=$rp}|ConvertTo-Json) -TimeoutSec 15; $t = $l.data.accessToken } catch { $o += "u${id}:login:FAIL"; return $o }
  $h = @{Authorization="Bearer $t"}
  $dl = (Get-Date).AddSeconds($d)
  while ((Get-Date) -lt $dl) {
    try { $sw = [System.Diagnostics.Stopwatch]::StartNew(); Invoke-RestMethod -Method GET -Uri "$b/folders" -Headers $h -TimeoutSec 10|Out-Null; $o += "u${id}:folders:$($sw.ElapsedMilliseconds)ms" } catch { $o += "u${id}:folders:FAIL" }
    try { $sw = [System.Diagnostics.Stopwatch]::StartNew(); Invoke-RestMethod -Method GET -Uri "$b/documents" -Headers $h -TimeoutSec 10|Out-Null; $o += "u${id}:docs:$($sw.ElapsedMilliseconds)ms" } catch { $o += "u${id}:docs:FAIL" }
    try { $sw = [System.Diagnostics.Stopwatch]::StartNew(); Invoke-RestMethod -Method GET -Uri "$b/health" -TimeoutSec 5|Out-Null; $o += "u${id}:health:$($sw.ElapsedMilliseconds)ms" } catch { $o += "u${id}:health:FAIL" }
    Start-Sleep -Milliseconds (Get-Random -Minimum 300 -Maximum 1200)
  }
  return $o
}
$jobs = @()
for ($i=1; $i -le $Users; $i++) { $j = Start-Job -ScriptBlock $sb -ArgumentList $base,$re,$rp,$Duration,$i; $jobs += $j }
$dl = (Get-Date).AddSeconds($Duration+20)
while ((Get-Date) -lt $dl) { $r = ($jobs|?{$_.State -eq 'Running'}).Count; if ($r -eq 0) { break }; Write-Host "  $r/$Users running..." -ForegroundColor DarkGray; Start-Sleep -Seconds 5 }
$all = @(); $ok = 0; $fail = 0; $lats = @()
foreach ($j in $jobs) { $d = Receive-Job $j -Wait; Remove-Job $j; foreach ($x in $d) { $all += $x; if ($x -match "FAIL") { $fail++ } else { $ok++ }; if ($x -match ":(\d+)ms`$") { $lats += [int]$matches[1] } } }
$sw.Stop()
$total = $ok + $fail
Write-Host ""
Write-Host "Requests: $total total (OK=$ok FAIL=$fail)" -ForegroundColor White
if ($lats.Count -gt 0) { $s = $lats|Sort-Object; $p50=$s[[math]::Floor($s.Count*0.5)]; $p95=$s[[math]::Floor($s.Count*0.95)]; $avg=[math]::Round(($lats|Measure-Object -Average).Average,1); Write-Host "Latency ms: avg=$avg p50=$p50 p95=$p95" -ForegroundColor Gray }
try { $h = Invoke-RestMethod -Method GET -Uri "$base/health" -TimeoutSec 5; Write-Host "Server: status=$($h.data.status) RSS=$($h.data.memory.rssMB)MB" -ForegroundColor White } catch { Write-Host "Server: unreachable" -ForegroundColor Red }
if ($fail -eq 0) { Write-Host "PASS" -ForegroundColor Green } else { Write-Host "FAILURES: $fail" -ForegroundColor Red }
