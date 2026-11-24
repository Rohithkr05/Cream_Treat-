@echo off
setlocal enabledelayedexpansion
title Cream Treat - QR Food Ordering System

echo ========================================================
echo   CREAM TREAT - LOCAL WI-FI & DEV STARTUP
echo ========================================================
echo.

REM 1. Detect Laptop Active Wi-Fi IPv4 Address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%a
    set IP=!IP: =!
    if not "!IP!"=="" if not "!IP:~0,4!"=="127." if not "!IP:~0,7!"=="169.254" (
        set LAN_IP=!IP!
        goto :ip_found
    )
)
set LAN_IP=127.0.0.1
:ip_found

echo Detected Wi-Fi IPv4: %LAN_IP%
echo.

REM 2. Check MongoDB
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

echo Starting Backend API on http://0.0.0.0:3001...
start "Cream Treat Backend" cmd /k "cd /d "%~dp0backend" && npm run start:prod"

echo Starting Frontend on http://0.0.0.0:3000...
start "Cream Treat Frontend" cmd /k "cd /d "%~dp0frontend" && npm run start"

echo.
echo ========================================================
echo   CREAM TREAT READY!
echo ========================================================
echo Laptop Localhost:
echo   - Customer Menu: http://localhost:3000/order?table=1
echo   - QR Standees:   http://localhost:3000/admin/qr
echo   - Google Review: http://localhost:3000/admin/reviews
echo   - Admin Portal:  http://localhost:3000/admin
echo   - Backend Health: http://localhost:3001/health
echo.
echo Mobile Phone (Same Wi-Fi Network):
echo   - Customer QR:   http://%LAN_IP%:3000/order?table=1
echo   - Diagnostics:   http://%LAN_IP%:3000/admin/diagnostics
echo ========================================================
echo.
echo Note: If your phone cannot connect (ERR_ADDRESS_UNREACHABLE),
echo ensure both devices are on the same Wi-Fi and allow port 3000
echo in Windows Firewall or switch Wi-Fi profile to 'Private'.
echo.
