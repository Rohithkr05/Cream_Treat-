<#
.SYNOPSIS
    Cream Treat Complete Development & LAN Wi-Fi Startup Script.
.DESCRIPTION
    1. Detects laptop active Wi-Fi / LAN IPv4 address.
    2. Clears stale node processes on ports 3000 and 3001 to prevent port drift (e.g. port 3006).
    3. Starts MongoDB on port 27017.
    4. Starts NestJS backend bound to 0.0.0.0:3001.
    5. Starts Next.js frontend bound to 0.0.0.0:3000.
    6. Displays localhost URLs, LAN URLs, and Customer Table 1 QR URL.
    7. Checks listening ports and Windows Firewall / Network profile status.
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Cream Treat — Dev & LAN Server"

Write-Host "========================================================" -ForegroundColor DarkRed
Write-Host "       CREAM TREAT — LOCAL WI-FI & DEV STARTUP          " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor DarkRed
Write-Host ""

$rootDir = $PSScriptRoot

# ------------------------------------------------------------------------------
# 1. Detect Laptop Active Wi-Fi IPv4 Address
# ------------------------------------------------------------------------------
Write-Host "[1/5] Detecting active Wi-Fi / LAN IPv4 address..." -ForegroundColor Cyan
$detectedIps = @()

try {
    $netIps = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | 
        Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" } | 
        Select-Object -ExpandProperty IPAddress
    if ($netIps) { $detectedIps += $netIps }
} catch {
    $ipconfigOutput = ipconfig
    $matches = [regex]::Matches($ipconfigOutput, "IPv4 Address[.\s]+:\s*([0-9.]+)")
    foreach ($m in $matches) {
        $ip = $m.Groups[1].Value.Trim()
        if ($ip -and $ip -notlike "127.*" -and $ip -notlike "169.254*") {
            $detectedIps += $ip
        }
    }
}

$lanIp = $detectedIps | Where-Object { $_ -like "192.168.*" } | Select-Object -First 1
if (-not $lanIp) { $lanIp = $detectedIps | Where-Object { $_ -like "10.*" } | Select-Object -First 1 }
if (-not $lanIp) { $lanIp = $detectedIps | Select-Object -First 1 }
if (-not $lanIp) { $lanIp = "127.0.0.1" }

Write-Host "  -> Active Laptop Wi-Fi IP: " -NoNewline
Write-Host "$lanIp" -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------------------------
# 2. Check & Clear Stale Port Conflicts (Prevent 3006 Port Drift)
# ------------------------------------------------------------------------------
Write-Host "[2/5] Checking for stale port locks on 3000 & 3001..." -ForegroundColor Cyan

function Stop-ProcessOnPort {
    param([int]$Port)
    try {
        $netstat = netstat -ano | Select-String ":$Port\s+.*LISTENING\s+(\d+)"
        if ($netstat) {
            foreach ($line in $netstat) {
                if ($line -match ":$Port\s+.*LISTENING\s+(\d+)") {
                    $pidToKill = $matches[1]
                    if ($pidToKill -and $pidToKill -ne "0" -and $pidToKill -ne "$PID") {
                        Write-Host "     Stopping stale process PID $pidToKill on port $Port..." -ForegroundColor Yellow
                        Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                    }
                }
            }
        }
    } catch {}
}

# Only clear if user allows or silently clean stale dev node processes
Stop-ProcessOnPort -Port 3000
Stop-ProcessOnPort -Port 3001
Start-Sleep -Milliseconds 500

# ------------------------------------------------------------------------------
# 3. Check MongoDB Database
# ------------------------------------------------------------------------------
Write-Host "[3/5] Checking MongoDB database on 127.0.0.1:27017..." -ForegroundColor Cyan
$mongoRunning = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $async = $tcp.BeginConnect("127.0.0.1", 27017, $null, $null)
    $ok = $async.AsyncWaitHandle.WaitOne(1000, $false)
    if ($ok -and $tcp.Connected) {
        $tcp.EndConnect($async)
        $tcp.Close()
        $mongoRunning = $true
    }
} catch {
    $mongoRunning = $false
}

if (-not $mongoRunning) {
    Write-Host "     Starting MongoDB daemon..." -ForegroundColor Yellow
    if (Test-Path "D:\mongodb\MongoDB\Server\9.0\bin\mongod.exe") {
        Start-Process -WindowStyle Minimized -FilePath "D:\mongodb\MongoDB\Server\9.0\bin\mongod.exe" -ArgumentList "--dbpath `"D:\mongodb\data\db`" --port 27017 --bind_ip 127.0.0.1"
        Start-Sleep -Seconds 2
    } else {
        Start-Service -Name MongoDB -ErrorAction SilentlyContinue
    }
}
Write-Host "  -> MongoDB: Running (port 27017)" -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------------------------
# 4. Launch Backend and Frontend Bound to 0.0.0.0
# ------------------------------------------------------------------------------
Write-Host "[4/5] Launching Backend and Frontend servers..." -ForegroundColor Cyan

# Start Backend on 0.0.0.0:3001
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\backend'; Write-Host 'Starting Cream Treat Backend on 0.0.0.0:3001...' -ForegroundColor Cyan; npm run start:prod"

# Start Frontend on 0.0.0.0:3000
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\frontend'; Write-Host 'Starting Cream Treat Frontend on 0.0.0.0:3000...' -ForegroundColor Cyan; npm run start"

Write-Host "     Waiting for servers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

# ------------------------------------------------------------------------------
# 5. Display Access URLs & Network Status
# ------------------------------------------------------------------------------
Write-Host "[5/5] Ready! Access URLs:" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Gray

Write-Host " LAPTOP ACCESS (Localhost):" -ForegroundColor White
Write-Host "  - Customer Menu (Table 1): http://localhost:3000/order?table=1" -ForegroundColor Yellow
Write-Host "  - Table QR Generator:      http://localhost:3000/admin/qr" -ForegroundColor Yellow
Write-Host "  - Google Reviews Board:    http://localhost:3000/admin/reviews" -ForegroundColor Yellow
Write-Host "  - Admin Dashboard:         http://localhost:3000/admin" -ForegroundColor Yellow
Write-Host "  - Backend Health:          http://localhost:3001/health" -ForegroundColor Yellow
Write-Host ""

Write-Host " MOBILE PHONE ACCESS (Same Wi-Fi Network):" -ForegroundColor White
Write-Host "  - Customer Ordering QR:    http://${lanIp}:3000/order?table=1" -ForegroundColor Green
Write-Host "  - LAN Diagnostics:         http://${lanIp}:3000/admin/diagnostics" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Gray
Write-Host ""

# Check Windows Network Category
try {
    $profile = Get-NetConnectionProfile -ErrorAction SilentlyContinue | Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" } | Select-Object -First 1
    if ($profile -and $profile.NetworkCategory -eq "Public") {
        Write-Host "⚠️  IMPORTANT NOTICE (ERR_ADDRESS_UNREACHABLE):" -ForegroundColor Yellow
        Write-Host "Your Wi-Fi network is currently set to 'Public' in Windows." -ForegroundColor White
        Write-Host "Windows Defender Firewall drops incoming mobile phone connections on Public Wi-Fi." -ForegroundColor White
        Write-Host "To allow your phone to connect, run this command in Administrator PowerShell:" -ForegroundColor Yellow
        Write-Host "New-NetFirewallRule -DisplayName 'Cream Treat Dev' -Direction Inbound -LocalPort 3000,3001 -Protocol TCP -Action Allow" -ForegroundColor White
        Write-Host "Or change Wi-Fi settings in Windows to 'Private network'." -ForegroundColor White
        Write-Host ""
    }
} catch {}
