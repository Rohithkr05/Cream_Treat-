<#
.SYNOPSIS
    Cream Treat Public HTTPS Tunnel Starter (Works on 4G, 5G, and Any Wi-Fi).
.DESCRIPTION
    Launches a free Cloudflare Quick Tunnel pointing to http://localhost:3000.
    Outputs the real public HTTPS URL that any mobile phone can open without shop Wi-Fi.
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Cream Treat — Public HTTPS Mobile Access"

Write-Host "========================================================" -ForegroundColor DarkGreen
Write-Host "     CREAM TREAT — PUBLIC HTTPS MOBILE ACCESS TUNNEL     " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor DarkGreen
Write-Host ""

$cloudflared = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
if (-not (Test-Path $cloudflared)) {
    Write-Host "Error: cloudflared not found at $cloudflared" -ForegroundColor Red
    exit 1
}

Write-Host "Starting Cloudflare Public Tunnel for http://localhost:3000..." -ForegroundColor Cyan
Write-Host "This works on Mobile Data (4G/5G) and any Wi-Fi network without router issues." -ForegroundColor White
Write-Host ""

& $cloudflared tunnel --url http://localhost:3000
