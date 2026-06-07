@echo off
title AppPilot Chrome CDP Launcher
echo ===================================================
echo   AppPilot Chrome CDP Remote Debugging Launcher
echo ===================================================
echo.

:: Check standard Chrome installation paths
set "CHROME_PATH="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else (
    set "CHROME_PATH=chrome.exe"
)

echo Select how you want to launch Google Chrome:
echo ---------------------------------------------------
echo [1] DEFAULT PROFILE (Recommended)
echo     - Reuses all your existing logged-in job portal sessions, history, and cookies.
echo     - CRITICAL: You MUST close all currently open Chrome windows first!
echo.
echo [2] SEPARATE ISOLATED PROFILE
echo     - Launches a dedicated Chrome window on a clean profile.
echo     - Can run simultaneously without closing your active Chrome windows.
echo     - Note: You will need to log into LinkedIn/Naukri/Indeed in this new window once.
echo ---------------------------------------------------
set /p choice="Choose launch mode (1 or 2, default is 1): "

if "%choice%"=="2" goto isolated

:default
echo.
echo Please close all existing Google Chrome windows now so the port can be attached.
echo Press any key once all Chrome windows are closed to launch...
pause > nul
echo.
echo Launching Google Chrome on port 9222 (Default Profile)...
start "" "%CHROME_PATH%" --remote-debugging-port=9222
goto end

:isolated
echo.
echo Launching Google Chrome on port 9222 (Isolated Profile)...
set "PROFILE_PATH=%LOCALAPPDATA%\AppPilotChromeProfile"
start "" "%CHROME_PATH%" --remote-debugging-port=9222 --user-data-dir="%PROFILE_PATH%"
goto end

:end
echo.
echo Chrome has been launched on port 9222!
echo AppPilot will now be able to automate applications in this window.
echo ===================================================
pause

