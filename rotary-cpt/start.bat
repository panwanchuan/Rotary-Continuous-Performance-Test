@echo off
cd /d "%~dp0"
set PORT=8080
set URL=http://localhost:%PORT%

echo Starting Rotary-CPT server...
echo.
echo   Open in your browser: %URL%
echo.
echo   A separate "Server" window will open. Close that window to stop.
echo.

start "Rotary-CPT Server" cmd /k "python -m http.server %PORT% 2>nul || py -m http.server %PORT%"
timeout /t 2 /nobreak >nul
start "" "%URL%"
