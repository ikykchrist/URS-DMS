# =============================================================================
# ngrok-remote-stop.ps1 — stop the remote backend tunnel, restore LOCAL dev
# -----------------------------------------------------------------------------
# Kills ngrok, restarts the API + Vite with the LOCAL .env files, and removes
# the temporary .env.remote (it is static and recreated identically on next
# start). Non-destructive: no database/Docker changes.
# =============================================================================

$ErrorActionPreference = 'Continue'
$root = 'C:\Dev\URS-DMS'

Write-Host 'Stopping ngrok tunnel...'
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

if (Test-Path "$root\.env.remote") { Remove-Item "$root\.env.remote" -Force; Write-Host 'Removed .env.remote' }

Write-Host 'Restarting API with local .env ...'
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -match 'tsx' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep 2
Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', "cd /d $root\server && npx tsx watch --env-file=$root\.env src/server.ts > $root\logs\dev-server-console.log 2>&1"

Write-Host 'Restarting Vite in local mode ...'
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -match 'vite' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep 2
Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', "cd /d $root\client && npm run dev > $root\logs\dev-client-console.log 2>&1"

Write-Host 'Done. Localhost development restored (frontend -> http://localhost:4000/api/v1).'
