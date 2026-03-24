@echo off
chcp 65001 >nul
echo ========================================
echo GraphTutor MongoDB 截图脚本
echo ========================================
echo.

cd /d "%~dp0\.."
powershell -ExecutionPolicy Bypass -File "tools\run-screenshot.ps1"

pause

