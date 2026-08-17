@echo off
echo =========================================
echo TaskFlow First-Time Setup
echo =========================================
echo.

call check-environment.bat
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Environment check failed. Please resolve the issues above.
    pause
    exit /b 1
)

echo.
echo Proceeding to install dependencies...
call install-dependencies.bat

echo.
echo Setting up environment files...
cd ..\..
IF NOT EXIST "backend\.env" (
    echo Creating backend\.env from template...
    copy backend\.env.example backend\.env
    echo [OK] backend\.env created. Please update it with your actual PostgreSQL credentials.
) ELSE (
    echo [OK] backend\.env already exists.
)

echo.
echo =========================================
echo Setup Complete!
echo =========================================
echo Please ensure you have:
echo 1. Created a PostgreSQL database named 'taskflow'.
echo 2. Updated backend\.env with the correct DATABASE_URL.
echo 3. Run the database/schema.sql script against your database.
echo.
echo Once done, you can double-click start.bat to run the application.
pause
