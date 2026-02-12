@echo off
echo ========================================
echo   PADEL TOURNAMENT SERVER
echo ========================================
echo.
echo Starting local server...
echo.

node server.js

if %errorlevel% neq 0 (
    echo.
    echo Error: Could not start server.
    echo Make sure Node.js is installed and available in PATH.
    echo.
    pause
)
