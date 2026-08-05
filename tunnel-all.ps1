$ErrorActionPreference = 'Stop'
$root = 'C:\Dev\URS-DMS'

Write-Host '============================================================'
Write-Host ' URS-DMS - Tunnel Everything (Cloudflare quick tunnels)'
Write-Host ' App (5173) | MinIO S3 (9000) | MinIO console (9001)'
Write-Host '============================================================'

Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

function Start-TunnelProcess($name, $port) {
    Start-Process -FilePath 'cloudflared' `
        -ArgumentList 'tunnel', '--url', "http://localhost:$port", '--no-autoupdate' `
        -RedirectStandardOutput "$root\urs-tunnel-$name.log" `
        -RedirectStandardError "$root\urs-tunnel-$name.err.log" `
        -WindowStyle Hidden
}

Start-TunnelProcess 'app' 5173
Start-TunnelProcess 'minio' 9000
Start-TunnelProcess 'console' 9001

function Get-TunnelUrl($name) {
    for ($i = 0; $i -lt 45; $i++) {
        Start-Sleep 1
        $log = Get-Content "$root\urs-tunnel-$name.err.log" -Raw -ErrorAction SilentlyContinue
        if ($log -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
            return $matches[0]
        }
    }
    throw "Tunnel '$name' did not become ready within 45s"
}

$appUrl = Get-TunnelUrl 'app'
Write-Host "App tunnel:     $appUrl"
$minioUrl = Get-TunnelUrl 'minio'
Write-Host "MinIO tunnel:   $minioUrl"
$consoleUrl = Get-TunnelUrl 'console'
Write-Host "Console tunnel: $consoleUrl"

if (-not (Test-Path "$root\.env.tunnel-backup")) {
    Copy-Item "$root\.env" "$root\.env.tunnel-backup" -Force
}

$envContent = [IO.File]::ReadAllText("$root\.env")
$envContent = $envContent.Replace("MINIO_PUBLIC_ENDPOINT=http://localhost:9000", "MINIO_PUBLIC_ENDPOINT=$minioUrl")
[IO.File]::WriteAllText("$root\.env", $envContent)
Write-Host 'Updated .env MINIO_PUBLIC_ENDPOINT'

Write-Host 'Restarting API server...'
& "$root\restart-server.ps1"

Start-Sleep 2
$appOk = $false
$minioOk = $false
for ($i = 0; $i -lt 15; $i++) {
    if (-not $appOk) {
        try {
            $h = Invoke-RestMethod -Uri "$appUrl/api/v1/health" -TimeoutSec 15
            Write-Host "API health via tunnel: $($h.data.status)"
            $appOk = $true
        } catch {
        }
    }
    if (-not $minioOk) {
        try {
            $r = Invoke-WebRequest -Uri "$minioUrl/minio/health/live" -UseBasicParsing -TimeoutSec 15
            Write-Host "MinIO health via tunnel: HTTP $($r.StatusCode)"
            $minioOk = $true
        } catch {
        }
    }
    if ($appOk -and $minioOk) { break }
    Start-Sleep 2
}

if (-not $appOk) { Write-Warning 'App tunnel health check FAILED' }
if (-not $minioOk) { Write-Warning 'MinIO tunnel health check FAILED' }

Write-Host ''
Write-Host '============================================================'
Write-Host ' SHARE THESE URLS'
Write-Host "  App:     $appUrl"
Write-Host "  MinIO:   $minioUrl"
Write-Host "  Console: $consoleUrl"
Write-Host '============================================================'
Write-Host 'Stop everything later with:  .\tunnel-stop.ps1'
