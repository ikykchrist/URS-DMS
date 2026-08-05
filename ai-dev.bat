@echo off
rem ===========================================================================
rem ai-dev.bat — open a fresh opencode session in C:\Dev\URS-DMS
rem Opens a NEW cmd window so the existing session / client are never touched.
rem ===========================================================================
start "URS-DMS opencode" cmd /k "cd /d C:\Dev\URS-DMS && opencode"
