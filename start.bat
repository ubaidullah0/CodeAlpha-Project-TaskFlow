@echo off
setlocal
echo =========================================
echo Starting TaskFlow Development Server
echo =========================================
echo.

:: 1. Check Node.js
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

:: 2. Check Dependencies
IF NOT EXIST "node_modules" (
    echo [WARNING] Root node_modules not found.
    echo Please run scripts\windows\setup.bat or "npm install" first.
    pause
    exit /b 1
)
IF NOT EXIST "backend\node_modules" (
    echo [WARNING] Backend node_modules not found.
    echo Please run scripts\windows\setup.bat or "cd backend && npm install" first.
    pause
    exit /b 1
)

:: 3. Check .env
IF NOT EXIST "backend\.env" (
    echo [ERROR] backend\.env file is missing.
    echo Please run scripts\windows\setup.bat or copy backend\.env.example to backend\.env
    pause
    exit /b 1
)

:: 4. Check PostgreSQL
psql -V >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [INFO] psql command not found.
    echo [INFO] Make sure your PostgreSQL server is running and configured in backend\.env
)

echo.
echo Starting Frontend and Backend...
echo.
echo =========================================
echo Frontend:      http://localhost:3000
echo Backend API:   http://localhost:5000
echo Health Check:  http://localhost:5000/api/health
echo =========================================
echo.
echo Press Ctrl+C or close this window to stop the servers.
echo Alternatively, run stop.bat.
echo.

:: 5. Start Servers
call npm run dev
