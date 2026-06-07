@echo off
title AppPilot Chrome CDP Launcher
echo ===================================================
echo   AppPilot Chrome CDP Remote Debugging Launcher
echo ===================================================
echo.
echo [1/2] Closing all existing Chrome instances to free up port 9222...
taskkill /f /im chrome.exe 2>nul
timeout /t 1 /nobreak >nul

echo [2/2] Launching Google Chrome in debugging mode...

:: Check standard Chrome installation paths
set "CHROME_PATH="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else (
    set "CHROME_PATH=chrome.exe"
)

:: Define user profile path for remote debugging
set "PROFILE_PATH=%LOCALAPPDATA%\AppPilotChromeProfile"

start "" "%CHROME_PATH%" --remote-debugging-port=9222 --user-data-dir="%PROFILE_PATH%"

echo.
echo Chrome has been launched on port 9222!
echo You can log into your job portals in this new Chrome window.
echo AppPilot will now be able to automate applications in this window.
echo ===================================================
pause
