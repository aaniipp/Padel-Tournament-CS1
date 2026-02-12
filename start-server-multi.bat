@echo off
echo ========================================
echo   PADEL TOURNAMENT SERVER
echo ========================================
echo.

REM Try different Python commands
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Found Python, starting server...
    python server.py
    goto :end
)

where python3 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Found Python3, starting server...
    python3 server.py
    goto :end
)

where py >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Found Python Launcher, starting server...
    py server.py
    goto :end
)

echo ========================================
echo ERROR: Python not found!
echo ========================================
echo.
echo Please install Python 3.6 or higher:
echo https://www.python.org/downloads/
echo.
echo After installation, run this script again.
echo.
pause
exit /b 1

:end
pause
