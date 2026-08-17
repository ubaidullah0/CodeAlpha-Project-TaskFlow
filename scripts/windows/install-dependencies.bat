@echo off
echo =========================================
echo TaskFlow Dependency Installer
echo =========================================

echo.
echo Installing root dependencies...
cd ..\..
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install root dependencies.
    pause
    exit /b 1
)

echo.
echo Installing backend dependencies...
cd backend
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install backend dependencies.
    pause
    exit /b 1
)

echo.
echo =========================================
echo [OK] All dependencies installed successfully!
echo =========================================
pause
