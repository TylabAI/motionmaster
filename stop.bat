@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-Content '.studio.pid' -ErrorAction SilentlyContinue; if($p){Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Remove-Item '.studio.pid' -ErrorAction SilentlyContinue}"
