@echo off
echo ===================================================
echo Starting TaskFlow Application
echo ===================================================
echo.

echo Starting Backend Server...
start cmd /k "cd ..\backend && npm run dev"

echo Starting Frontend Server...
start cmd /k "cd ..\frontend && npx --yes serve . -p 3000"

echo.
echo Application is starting! 
echo Frontend will be available at: http://localhost:3000
echo Backend API is running on: http://localhost:5000
echo.
pause
