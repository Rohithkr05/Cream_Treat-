# Cream Treat — Complete Same-Wi-Fi (LAN) Mobile QR Access Setup Guide

This guide provides the exact, permanent configuration and step-by-step instructions for running the Cream Treat QR dining application on a laptop and testing table QR ordering from any mobile phone connected to the same Wi-Fi network.

---

## 1. System Architecture & Ports

| Component | Port | Network Interface | Expected URL on Laptop | Expected URL on Mobile (Same Wi-Fi) |
| :--- | :---: | :---: | :--- | :--- |
| **Frontend (Next.js)** | `3000` | `0.0.0.0` | `http://localhost:3000` | `http://<laptop-wi-fi-ip>:3000` |
| **Backend REST API (NestJS)** | `3001` | `0.0.0.0` | `http://localhost:3001` | `http://<laptop-wi-fi-ip>:3001` |
| **Socket.IO Gateway** | `3001` | `0.0.0.0` | `ws://localhost:3001` | `ws://<laptop-wi-fi-ip>:3001` |
| **Database** | `27017` / Cloud | Cloud / Local | Connected via Mongoose | Handled server-side by backend |

---

## 2. Root Cause of Previous Mobile Failures

### Cause A: Port Drift (`:3006` vs `:3000`)
- When Next.js is started with `npm run dev` and port 3000 is occupied by an orphaned background process, Next.js automatically increments the port:
  `Port 3000 is in use, trying 3001... 3002... 3006!`
- If an admin visits `/admin/qr` on that temporary port, the QR code encodes `:3006`.
- Once that dev server is closed, port `3006` is dead.
- Scanning `http://192.168.70.111:3006/order?table=1` results in `ERR_ADDRESS_UNREACHABLE` or `ERR_CONNECTION_REFUSED`.
- **Fix**: The startup script now clears stale node processes so the frontend **always runs on port 3000**, and `/api/lan-ip` dynamically reads the incoming request's `Host` header to ensure QR codes always match the active server port.

### Cause B: Windows Defender Firewall & "Public" Wi-Fi Profile
- On Windows, Wi-Fi networks default to the **`Public`** network profile.
- In Public mode, Windows Firewall drops unsolicited incoming TCP connections from other devices on the LAN.
- The phone's TCP SYN packets are silently discarded by the laptop, causing Chrome to display `ERR_ADDRESS_UNREACHABLE` or `ERR_CONNECTION_TIMED_OUT`.
- **Fix**: Switch the Wi-Fi profile from *Public* to *Private* in Windows Settings, or run the one-line inbound firewall rule in Administrator PowerShell.

### Cause C: Wi-Fi Router AP Isolation (Client Isolation)
- Many commercial or cafe Wi-Fi routers have "AP Isolation" or "Guest Wi-Fi" enabled.
- AP Isolation allows devices to browse the Internet, but blocks devices connected to the same Wi-Fi from talking to each other.
- **Bypass / Test**: Turn on **Personal Hotspot** on your phone, connect the laptop to the phone's hotspot. Because phone hotspots do not have AP isolation, it connects instantly!

---

## 3. How the Permanent Fix Works

1. **Dynamic Dev Origin Resolution (`frontend/next.config.ts`):**
   `allowedDevOrigins` dynamically enumerates all local IPv4 network interfaces on startup using Node's `os.networkInterfaces()`, automatically whitelisting your laptop's active IP across any Wi-Fi network.
2. **Automatic LAN IP & Port Detection (`frontend/app/api/lan-ip/route.ts` & `/admin/qr`):**
   When the Admin QR Standee page loads, it queries `/api/lan-ip`. It dynamically detects the active port from the request's `Host:` header and your laptop's active Wi-Fi IPv4 address.
3. **Resilient Client-Side URL Resolution (`frontend/lib/checkout.ts` & `frontend/lib/socket.ts`):**
   When a mobile phone accesses `http://<laptop-ip>:3000`, client-side JavaScript automatically routes REST API calls and WebSocket connections to `http://<laptop-ip>:3001`.
4. **Development CORS Whitelist (`backend/src/main.ts` & `backend/src/orders/orders.gateway.ts`):**
   The NestJS backend allows all local LAN origins (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`, and `localhost`) during development with credentials enabled.
5. **Real-time Diagnostic Dashboard (`/admin/diagnostics`):**
   A dedicated development diagnostic page checks backend health, MongoDB connection status, Socket.IO connectivity, and shows the live scannable Table 1 QR code.

---

## 4. Quick Startup Instructions

### Step 1: Start All Services with One Command
From your project root directory, run:
```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```
*(Or double-click `start.bat`).*

This script:
1. Detects your laptop's active Wi-Fi IPv4 address.
2. Clears any stale port locks on 3000 and 3001.
3. Starts MongoDB, NestJS Backend (port 3001), and Next.js Frontend (port 3000).
4. Displays the scannable Table 1 URL.

---

### Step 2: Configure Windows Firewall (One-Time Setup)
Open **PowerShell as Administrator** and run:
```powershell
New-NetFirewallRule -DisplayName "Cream Treat Dev Ports" -Direction Inbound -LocalPort 3000,3001 -Protocol TCP -Action Allow
```

And switch your Wi-Fi network profile to **Private**:
> *Windows Settings > Network & Internet > Wi-Fi > Click on your connected network (e.g. "1st floor") > Select **Private network**.*

---

## 5. How to Test Table QR Ordering From Mobile Phone

1. **Connect Smartphone to the Same Wi-Fi:**
   Ensure your mobile phone is connected to the same Wi-Fi network as the laptop (and that mobile data 4G/5G is turned off if your Wi-Fi has no internet).
2. **Open Admin QR Page on Laptop:**
   ```
   http://localhost:3000/admin/qr
   ```
   Notice that the generator automatically detects your laptop's Wi-Fi IP and displays:
   `🟢 Same-Wi-Fi Mobile Ready (http://<your-wifi-ip>:3000)`
3. **Scan Table 1 QR Code:**
   Open the Camera or Google Lens on your smartphone and point it at the Table 1 QR code on your laptop screen.
4. **Browse & Order:**
   - Tap the link: `http://<your-wifi-ip>:3000/order?table=1`.
   - The menu loads with authentic food photography.
   - Add items to the cart and click **Place Order**.
   - Your order number (e.g. `#001`) and order summary appear.
5. **Verify on Laptop:**
   - On your laptop, navigate to `http://localhost:3000/admin`.
   - The incoming order arrives instantly via Socket.IO!

---

## 6. Troubleshooting Common Wi-Fi Issues

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| Phone shows `ERR_ADDRESS_UNREACHABLE` at port 3006 | Server running on 3000, not 3006 | Open `http://localhost:3000/admin/qr`, verify it shows port 3000, and scan the new QR code. |
| Phone shows `ERR_ADDRESS_UNREACHABLE` at port 3000 | Windows Wi-Fi profile set to "Public" or Firewall blocking | Run firewall rule command as Administrator and set Wi-Fi to "Private" in Windows Settings. |
| Phone cannot reach laptop IP even on same Wi-Fi | Router has AP / Client Isolation turned ON | Turn on **Mobile Hotspot** on your phone, connect laptop to it, and re-run `.\start.ps1`. |
| Phone shows `ERR_CONNECTION_REFUSED` | QR code encoded `localhost` | Regenerate standees at `/admin/qr` using the detected LAN IP. |
| Menu loads but order submission fails | Backend not running or CORS rejection | Ensure backend is running and `http://<ip>:3001/health` returns `{"status":"ok"}`. |
