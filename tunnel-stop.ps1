$ErrorActionPreference = 'Stop'
$root = 'C:\Dev\URS-DMS'

Write-Host 'Stopping all Cloudflare tunnels...'
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

if (Test-Path "$root\.env.tunnel-backup") {
    Write-Host 'Restoring .env from backup...'
    Copy-Item "$root\.env.tunnel-backup" "$root\.env" -Force
    Remove-Item "$root\.env.tunnel-backup" -Force
}

Write-Host 'Restarting API server with local endpoints...'
& "$root\restart-server.ps1"

Write-Host 'Done. Tunnels stopped, .env restored.'
