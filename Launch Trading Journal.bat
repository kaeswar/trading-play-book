@echo off
title Trading Journal
cd /d D:\TPB_OC_Version\trading-journal

:: Kill any existing Vite dev server on port 5173
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill any lingering Electron processes for this app
taskkill /F /IM electron.exe >nul 2>&1

:: Launch the app
npm run electron:dev
