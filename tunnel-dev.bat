@echo off
echo Starting full tunnel setup (app + MinIO + console)...
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Dev\URS-DMS\tunnel-all.ps1"
pause
