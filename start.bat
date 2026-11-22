@echo off
echo ========================================================
echo   Starting Cream Treat - QR Food Ordering System
echo ========================================================

REM Check if MongoDB is running on port 27017
powershell -NoProfile -Command "try { $t = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 27017); $t.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Starting MongoDB database...
    if exist "D:\mongodb\MongoDB\Server\9.0\bin\mongod.exe" (
        start "MongoDB Server" /min "D:\mongodb\MongoDB\Server\9.0\bin\mongod.exe" --dbpath "D:\mongodb\data\db" --port 27017 --bind_ip 127.0.0.1
        timeout /t 2 >nul
    ) else (
        net start MongoDB 2>nul
    )
)

echo Starting Backend API on http://localhost:3001...
start "Cream Treat Backend" cmd /k "cd /d "%~dp0backend" && node dist\main.js"

echo Starting Frontend on http://localhost:3000...
start "Cream Treat Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers started!
echo Frontend: http://localhost:3000
echo Customer Order: http://localhost:3000/order?table=1
echo Admin Login: http://localhost:3000/admin/login
echo Backend API: http://localhost:3001
echo ========================================================
