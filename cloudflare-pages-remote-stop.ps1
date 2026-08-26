$ErrorActionPreference = 'Continue'
$root = 'C:\Dev\URS-DMS'

Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -match 'tsx' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep 2

Start-Process cmd.exe -ArgumentList '/k', "cd /d $root\server && npx tsx watch --env-file=$root\.env src/server.ts > $root\logs\dev-server-console.log 2>&1"
Write-Host 'Cloudflare tunnel stopped; backend restarted in localhost mode.'
