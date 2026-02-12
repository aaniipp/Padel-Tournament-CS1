@echo off
echo ========================================
echo   PADEL TOURNAMENT SERVER (Node.js)
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ========================================
    echo ERROR: Node.js not found!
    echo ========================================
    echo.
    echo Please install Node.js:
    echo https://nodejs.org/
    echo.
    echo After installation, run this script again.
    echo.
    pause
    exit /b 1
)

echo Found Node.js, starting server...
echo.
node server.js
pause
