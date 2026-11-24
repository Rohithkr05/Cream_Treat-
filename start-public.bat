@echo off
title Cream Treat - Public HTTPS Mobile Tunnel
echo ========================================================
echo   CREAM TREAT - PUBLIC HTTPS MOBILE ACCESS
echo ========================================================
echo Starting Cloudflare Tunnel for http://localhost:3000...
echo.
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
pause
