@echo off
echo =========================================
echo Stopping TaskFlow Development Servers
echo =========================================
echo.

echo Attempting to stop process on port 5000 (Backend)...
FOR /F "tokens=5" %%T IN ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') DO (
    echo Killing process %%T
    taskkill /F /PID %%T >nul 2>&1
)

echo Attempting to stop process on port 3000 (Frontend)...
FOR /F "tokens=5" %%T IN ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') DO (
    echo Killing process %%T
    taskkill /F /PID %%T >nul 2>&1
)

echo.
echo Servers stopped successfully.
pause
