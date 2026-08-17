@echo off
echo ===================================================
echo TaskFlow - Windows Installation Setup
echo ===================================================
echo.

echo [1/2] Installing Backend Dependencies...
cd ..\backend
call npm install

echo.
echo [2/2] Checking Frontend (No installation needed for Vanilla JS)...
echo.

echo Setup Complete! You can now run the project using start_project.bat
pause
