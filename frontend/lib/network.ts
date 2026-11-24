import os from 'os';

export interface DetectedLanInfo {
  primaryIp: string;
  allIps: string[];
  port: number;
  backendPort: number;
  frontendLanUrl: string;
  backendLanUrl: string;
}

/**
 * Enumerates active IPv4 network interfaces to find the laptop's Wi-Fi / LAN IP.
 * Prioritizes standard RFC 1918 subnets (192.168.x.x, 10.x.x.x, 172.16-31.x.x).
 */
export function getDetectedLanInfo(
  frontendPort = 3000,
  backendPort = 3001,
): DetectedLanInfo {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  // Prioritize 192.168.x.x (typical Wi-Fi home/café router)
  const primaryIp =
    addresses.find((ip) => ip.startsWith('192.168.')) ||
    addresses.find((ip) => ip.startsWith('10.')) ||
    addresses.find((ip) => /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) ||
    addresses[0] ||
    '127.0.0.1';

  return {
    primaryIp,
    allIps: addresses,
    port: frontendPort,
    backendPort,
    frontendLanUrl: `http://${primaryIp}:${frontendPort}`,
    backendLanUrl: `http://${primaryIp}:${backendPort}`,
  };
}
