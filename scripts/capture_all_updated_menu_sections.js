const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

function getPageWsUrl(port) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const list = JSON.parse(data);
            const page = list.find(t => t.type === 'page');
            if (page && page.webSocketDebuggerUrl) {
              clearInterval(interval);
              resolve(page.webSocketDebuggerUrl);
            }
          } catch {}
        });
      }).on('error', () => {});

      if (Date.now() - start > 15000) {
        clearInterval(interval);
        reject(new Error('Timeout connecting to Chrome CDP page target'));
      }
    }, 200);
  });
}

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9288;
  const tempProfile = path.join(os.tmpdir(), 'chrome_audit_profile_' + Date.now());
  const brainDir = 'C:\\Users\\krroh\\.gemini\\antigravity\\brain\\87b400db-c065-4106-a512-1d03fdd7e795';

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + tempProfile,
    '--window-size=1280,1200',
    '--hide-scrollbars',
    'about:blank',
  ]);

  try {
    const wsUrl = await getPageWsUrl(port);
    const WebSocket = require('../backend/node_modules/ws');
    const ws = new WebSocket(wsUrl);

    await new Promise((resolve) => ws.on('open', resolve));

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (data) => {
          const res = JSON.parse(data.toString());
          if (res.id === id) {
            ws.off('message', handler);
            resolve(res.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');

    // Admin login
    const authData = await new Promise((resolve) => {
      const req = http.request('http://127.0.0.1:3001/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.write(JSON.stringify({ email: 'admin@creamtreat.local', password: 'Admin@CreamTreat2026!' }));
      req.end();
    });

    await send('Page.navigate', { url: 'http://localhost:3000/admin/login' });
    await new Promise(r => setTimeout(r, 1200));

    await send('Runtime.evaluate', {
      expression: `
        sessionStorage.setItem('ct_admin_access_token', ${JSON.stringify(authData.accessToken)});
        sessionStorage.setItem('ct_admin_user', ${JSON.stringify(JSON.stringify(authData.admin))});
      `
    });

    await send('Page.navigate', { url: 'http://localhost:3000/admin/menu' });
    await new Promise(r => setTimeout(r, 2500));

    // 1. Filter: Mojito (Mojitos & Lassis)
    await send('Runtime.evaluate', {
      expression: `
        const selects = document.querySelectorAll('select');
        const catSelect = Array.from(selects).find(s => Array.from(s.options).some(o => o.text.includes('Mojito')));
        if (catSelect) {
          const opt = Array.from(catSelect.options).find(o => o.text.includes('Mojito'));
          if (opt) {
            catSelect.value = opt.value;
            catSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      `
    });
    await new Promise(r => setTimeout(r, 1000));
    const mojitoShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(brainDir, 'admin_menu_mojitos_lassis_verified.png'), Buffer.from(mojitoShot.data, 'base64'));
    console.log('Saved admin_menu_mojitos_lassis_verified.png');

    // 2. Filter: Sandwich
    await send('Runtime.evaluate', {
      expression: `
        const selects = document.querySelectorAll('select');
        const catSelect = Array.from(selects).find(s => Array.from(s.options).some(o => o.text.includes('Sandwich')));
        if (catSelect) {
          const opt = Array.from(catSelect.options).find(o => o.text.includes('Sandwich'));
          if (opt) {
            catSelect.value = opt.value;
            catSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      `
    });
    await new Promise(r => setTimeout(r, 1000));
    const sandwichShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(brainDir, 'admin_menu_sandwiches_verified.png'), Buffer.from(sandwichShot.data, 'base64'));
    console.log('Saved admin_menu_sandwiches_verified.png');

    // 3. Filter: Maggie
    await send('Runtime.evaluate', {
      expression: `
        const selects = document.querySelectorAll('select');
        const catSelect = Array.from(selects).find(s => Array.from(s.options).some(o => o.text.includes('Maggie')));
        if (catSelect) {
          const opt = Array.from(catSelect.options).find(o => o.text.includes('Maggie'));
          if (opt) {
            catSelect.value = opt.value;
            catSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      `
    });
    await new Promise(r => setTimeout(r, 1000));
    const maggieShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(brainDir, 'admin_menu_maggies_verified.png'), Buffer.from(maggieShot.data, 'base64'));
    console.log('Saved admin_menu_maggies_verified.png');

    ws.close();
  } finally {
    chromeProc.kill();
    try {
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch {}
  }
}

main().catch(console.error);
