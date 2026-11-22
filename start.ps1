Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting Cream Treat - QR Food Ordering System" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Check MongoDB
$mongoRunning = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 27017)
    $tcp.Close()
    $mongoRunning = $true
} catch {
    $mongoRunning = $false
}

if (-not $mongoRunning) {
    Write-Host "Starting MongoDB database..." -ForegroundColor Yellow
    if (Test-Path "D:\mongodb\MongoDB\Server\9.0\bin\mongod.exe") {
        Start-Process -WindowStyle Minimized -FilePath "D:\mongodb\MongoDB\Server\9.0\bin\mongod.exe" -ArgumentList "--dbpath `"D:\mongodb\data\db`" --port 27017 --bind_ip 127.0.0.1"
        Start-Sleep -Seconds 2
    } else {
        Start-Service -Name MongoDB -ErrorAction SilentlyContinue
    }
}

$rootDir = $PSScriptRoot

# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\backend'; node dist/main.js"

# Start frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\frontend'; npm run dev"

Write-Host "`nBoth servers have been launched!" -ForegroundColor Green
Write-Host "Frontend:       http://localhost:3000" -ForegroundColor White
Write-Host "Customer Order: http://localhost:3000/order?table=1" -ForegroundColor White
Write-Host "Admin Portal:   http://localhost:3000/admin/login" -ForegroundColor White
Write-Host "Backend API:    http://localhost:3001" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
