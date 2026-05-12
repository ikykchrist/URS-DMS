$ErrorActionPreference = 'SilentlyContinue'
$process = Start-Process -FilePath "node_modules\.bin\vite.cmd" -WorkingDirectory "C:\Users\cjbal\[01] Folder ng pogi\[01] Acads\URS-DMS" -PassThru -WindowStyle Normal
Write-Host "Started process ID: $($process.Id)"
