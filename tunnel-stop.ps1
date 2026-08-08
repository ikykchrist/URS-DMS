$ErrorActionPreference = 'Stop'
$root = 'C:\Dev\URS-DMS'

Write-Host 'Stopping all Cloudflare tunnels...'
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

if (Test-Path "$root\.env.tunnel-backup") {
    Write-Host 'Restoring .env from backup...'
    Copy-Item "$root\.env.tunnel-backup" "$root\.env" -Force
    Remove-Item "$root\.env.tunnel-backup" -Force
}

# Clean up any stale MINIO_PUBLIC_ENDPOINT tunnel URL that may have leaked
$envContent = [IO.File]::ReadAllText("$root\.env")
$envContent = [regex]::Replace($envContent, 'MINIO_PUBLIC_ENDPOINT=https://[a-z0-9-]+\.trycloudflare\.com', '')
# If the line became empty after removal, remove the empty line
$envContent = $envContent -replace '\n\n+', "`n"
[IO.File]::WriteAllText("$root\.env", $envContent)
Write-Host 'Cleared stale MINIO_PUBLIC_ENDPOINT tunnel URL'

Write-Host 'Restarting API server with local endpoints...'
& "$root\restart-server.ps1"

Write-Host 'Restarting Vite with the local API base (no tunnel)...'
$viteProc = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -match 'vite' } |
    Select-Object -First 1
if ($viteProc) {
    Stop-Process -Id $viteProc.ProcessId -Force
    Start-Sleep 2
}
Start-Process -FilePath 'cmd.exe' -ArgumentList '/k','cd /d C:\Dev\URS-DMS\client && npm run dev'

Write-Host 'Done. Tunnels stopped, .env restored, local dev back on localhost.'
