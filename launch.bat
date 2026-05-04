@echo off
:: Chess 2.0 — Windows Launcher
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js not found. Install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
npx electron . %*
