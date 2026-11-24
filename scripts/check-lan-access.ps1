<#
.SYNOPSIS
    Cream Treat Local Wi-Fi (LAN) Mobile Access Diagnostic & Verification Script.

.DESCRIPTION
    Safely inspects the laptop's active Wi-Fi network interface, checks whether
    frontend (3000) and backend (3001) are listening on 0.0.0.0, verifies backend health and
    database connectivity, displays the customer QR ordering URL, inspects Windows
    Defender Firewall rules, and checks Network Profile Category (Private vs Public).
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Cream Treat — LAN Access Diagnostics"

Write-Host "=================================================================" -ForegroundColor DarkRed
Write-Host "       CREAM TREAT — LOCAL WI-FI (LAN) ACCESS DIAGNOSTICS        " -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor DarkRed
Write-Host ""

# ------------------------------------------------------------------------------
# 1. Detect Laptop Active Wi-Fi / LAN IPv4 Address
# ------------------------------------------------------------------------------
Write-Host "[1/6] Detecting laptop local network IPv4 address..." -ForegroundColor Cyan

$detectedIps = @()

try {
    $netIps = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | 
        Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" } | 
        Select-Object -ExpandProperty IPAddress
    if ($netIps) {
        $detectedIps += $netIps
    }
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
if (-not $lanIp) {
    $lanIp = $detectedIps | Where-Object { $_ -like "10.*" } | Select-Object -First 1
}
if (-not $lanIp) {
    $lanIp = $detectedIps | Select-Object -First 1
}
if (-not $lanIp) {
    $lanIp = "127.0.0.1"
}

Write-Host "  -> Active Laptop Wi-Fi IPv4: " -NoNewline
Write-Host "$lanIp" -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------------------------
# 2. Check Frontend Port (3000) & Backend Port (3001)
# ------------------------------------------------------------------------------
$frontendPort = 3000
$backendPort  = 3001

Write-Host "[2/6] Checking server process listening state..." -ForegroundColor Cyan

function Test-PortListening {
    param([int]$Port)
    $listening = $false
    $bindAddress = "0.0.0.0"

    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $tcpClient.BeginConnect("127.0.0.1", $Port, $null, $null)
        $success = $asyncResult.AsyncWaitHandle.WaitOne(1000, $false)
        if ($success -and $tcpClient.Connected) {
            $listening = $true
            $tcpClient.EndConnect($asyncResult)
            $tcpClient.Close()
        }
    } catch {}

    try {
        $netstat = netstat -ano | Select-String ":$Port\s+.*LISTENING"
        if ($netstat) {
            $listening = $true
            if ($netstat -match "0\.0\.0\.0:$Port") {
                $bindAddress = "0.0.0.0 (Accessible to LAN)"
            } elseif ($netstat -match "127\.0\.0\.1:$Port") {
                $bindAddress = "127.0.0.1 (Localhost Only!)"
            }
        }
    } catch {}

    return [PSCustomObject]@{
        Listening   = $listening
        BindAddress = $bindAddress
    }
}

$frontendStatus = Test-PortListening -Port $frontendPort
$backendStatus  = Test-PortListening -Port $backendPort

Write-Host "  -> Frontend (Port $frontendPort): " -NoNewline
if ($frontendStatus.Listening) {
    Write-Host "LISTENING ($($frontendStatus.BindAddress))" -ForegroundColor Green
} else {
    Write-Host "NOT LISTENING (Run 'npm run start' inside frontend folder)" -ForegroundColor Red
}

Write-Host "  -> Backend  (Port $backendPort): " -NoNewline
if ($backendStatus.Listening) {
    Write-Host "LISTENING ($($backendStatus.BindAddress))" -ForegroundColor Green
} else {
    Write-Host "NOT LISTENING (Run 'npm run start:prod' inside backend folder)" -ForegroundColor Red
}

# Check for obsolete port 3006
$port3006Status = Test-PortListening -Port 3006
if ($port3006Status.Listening) {
    Write-Host "  -> Warning: Port 3006 is also active. Ensure clients use Port 3000!" -ForegroundColor Yellow
}
Write-Host ""

# ------------------------------------------------------------------------------
# 3. Check Backend Health Endpoint & MongoDB Status
# ------------------------------------------------------------------------------
Write-Host "[3/6] Testing Backend Health endpoint..." -ForegroundColor Cyan

$healthUrl = "http://127.0.0.1:$backendPort/health"
$healthOk = $false
$dbStatus = "Unknown"

try {
    $healthRes = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 3 -ErrorAction Stop
    if ($healthRes -and $healthRes.status -eq "ok") {
        $healthOk = $true
        $dbStatus = $healthRes.database
    }
} catch {
    $healthOk = $false
}

Write-Host "  -> Backend API Health: " -NoNewline
if ($healthOk) {
    Write-Host "OK (Healthy)" -ForegroundColor Green
    Write-Host "  -> MongoDB Database:   " -NoNewline
    if ($dbStatus -eq "connected") {
        Write-Host "CONNECTED" -ForegroundColor Green
    } else {
        Write-Host "$dbStatus" -ForegroundColor Yellow
    }
} else {
    Write-Host "FAILED (Backend not responding at $healthUrl)" -ForegroundColor Red
}
Write-Host ""

# ------------------------------------------------------------------------------
# 4. Check Frontend LAN Endpoint
# ------------------------------------------------------------------------------
Write-Host "[4/6] Testing Frontend LAN configuration endpoint..." -ForegroundColor Cyan

$lanEndpointUrl = "http://127.0.0.1:$frontendPort/api/lan-ip"
$frontendApiOk = $false

try {
    $lanRes = Invoke-RestMethod -Uri $lanEndpointUrl -Method Get -TimeoutSec 3 -ErrorAction Stop
    if ($lanRes -and $lanRes.primaryIp) {
        $frontendApiOk = $true
    }
} catch {
    $frontendApiOk = $false
}

Write-Host "  -> Frontend API Route (/api/lan-ip): " -NoNewline
if ($frontendApiOk) {
    Write-Host "OK (Active - IP: $($lanRes.primaryIp), Port: $($lanRes.port))" -ForegroundColor Green
} else {
    Write-Host "Not yet responding" -ForegroundColor Yellow
}
Write-Host ""

# ------------------------------------------------------------------------------
# 5. Check Windows Network Profile & Defender Firewall
# ------------------------------------------------------------------------------
Write-Host "[5/6] Inspecting Windows Network Profile & Firewall Rules..." -ForegroundColor Cyan

$isPublicProfile = $false
try {
    $profiles = Get-NetConnectionProfile -ErrorAction SilentlyContinue
    $wifiProfile = $profiles | Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" } | Select-Object -First 1
    if ($wifiProfile) {
        Write-Host "  -> Active Network: $($wifiProfile.Name) ($($wifiProfile.InterfaceAlias))" -ForegroundColor White
        Write-Host "  -> Network Category: " -NoNewline
        if ($wifiProfile.NetworkCategory -eq "Public") {
            $isPublicProfile = $true
            Write-Host "PUBLIC (Blocks incoming LAN connections by default!)" -ForegroundColor Red
        } else {
            Write-Host "$($wifiProfile.NetworkCategory)" -ForegroundColor Green
        }
    }
} catch {}

$firewallRulesFound = $false
try {
    $netshRules = netsh advfirewall firewall show rule name=all | Select-String "3000|3001"
    if ($netshRules) {
        $firewallRulesFound = $true
    }
} catch {}

if ($firewallRulesFound) {
    Write-Host "  -> Windows Firewall: Inbound rule for application ports detected." -ForegroundColor Green
} else {
    Write-Host "  -> Windows Firewall Notice:" -ForegroundColor Yellow
    Write-Host "     If your phone cannot load the page (ERR_ADDRESS_UNREACHABLE):" -ForegroundColor White
    Write-Host "     1. Set Wi-Fi network profile to 'Private' in Windows Settings." -ForegroundColor Yellow
    Write-Host "     2. Or run this in Administrator PowerShell:" -ForegroundColor Yellow
    Write-Host "        New-NetFirewallRule -DisplayName 'Cream Treat Dev' -Direction Inbound -LocalPort 3000,3001 -Protocol TCP -Action Allow" -ForegroundColor White
}
Write-Host ""

# ------------------------------------------------------------------------------
# 6. Customer QR Ordering URL
# ------------------------------------------------------------------------------
Write-Host "[6/6] Verified Mobile Customer Access URL" -ForegroundColor Cyan

$customerTable1Url = "http://${lanIp}:${frontendPort}/order?table=1"
$adminDiagnosticsUrl = "http://${lanIp}:${frontendPort}/admin/diagnostics"

Write-Host "-----------------------------------------------------------------" -ForegroundColor Gray
Write-Host " Customer QR URL for Table 1:" -ForegroundColor White
Write-Host " $customerTable1Url" -ForegroundColor Yellow -BackgroundColor Black
Write-Host ""
Write-Host " Admin QR Management:" -ForegroundColor White
Write-Host " http://localhost:3000/admin/qr" -ForegroundColor Cyan
Write-Host ""
Write-Host " Admin LAN Diagnostics Dashboard:" -ForegroundColor White
Write-Host " $adminDiagnosticsUrl" -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------------" -ForegroundColor Gray
Write-Host ""

Write-Host "Next Steps for Mobile Phone Testing:" -ForegroundColor Yellow
Write-Host "1. Ensure smartphone is connected to the SAME Wi-Fi network ('1st floor')."
Write-Host "2. Turn OFF mobile cellular data (4G/5G) on the phone if Wi-Fi has no active internet."
Write-Host "3. Point smartphone camera at Table 1 QR on laptop screen."
Write-Host "4. Tap the link and test ordering!"
Write-Host ""
