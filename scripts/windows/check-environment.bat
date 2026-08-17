@echo off
echo =========================================
echo TaskFlow Environment Check
echo =========================================

echo Checking Node.js...
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
) ELSE (
    echo [OK] Node.js is installed.
)

echo Checking npm...
npm -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed or not in PATH.
    exit /b 1
) ELSE (
    echo [OK] npm is installed.
)

echo Checking PostgreSQL (psql)...
psql -V >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [WARNING] psql command not found. PostgreSQL might not be installed or not in your PATH.
    echo Make sure you have a running PostgreSQL database available.
) ELSE (
    echo [OK] PostgreSQL tools found.
)

echo Checking backend structure...
IF NOT EXIST "..\..\backend\src\server.js" (
    echo [ERROR] Backend src/server.js not found.
) ELSE (
    echo [OK] Backend structure looks good.
)

echo Checking frontend structure...
IF NOT EXIST "..\..\frontend\index.html" (
    echo [ERROR] Frontend index.html not found.
) ELSE (
    echo [OK] Frontend structure looks good.
)

echo Checking backend environment variables...
IF NOT EXIST "..\..\backend\.env" (
    echo [WARNING] backend\.env not found. You will need to create it from backend\.env.example
) ELSE (
    echo [OK] backend\.env found.
)

echo.
echo Environment check complete.
exit /b 0
