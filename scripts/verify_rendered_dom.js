const { spawn } = require('child_process');
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');

function getWsUrl(port) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      http.get('http://127.0.0.1:' + port + '/json/list', res => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => {
          try {
            const list = JSON.parse(d);
            const p = list.find(t => t.type === 'page');
            if (p && p.webSocketDebuggerUrl) {
              clearInterval(interval);
              resolve(p.webSocketDebuggerUrl);
            }
          } catch {}
        });
      }).on('error', () => {});
      if (Date.now() - start > 10000) { clearInterval(interval); reject(new Error('timeout')); }
    }, 200);
  });
}

async function test() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9311;
  const tempProfile = path.join(os.tmpdir(), 'chrome_dom_' + Date.now());
  const brainDir = 'C:\\Users\\krroh\\.gemini\\antigravity\\brain\\87b400db-c065-4106-a512-1d03fdd7e795';
  const proc = spawn(chromePath, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tempProfile, '--window-size=1280,1400', 'about:blank']);
  try {
    const wsUrl = await getWsUrl(port);
    const WebSocket = require('../backend/node_modules/ws');
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.on('open', r));

    let id = 1;
    function send(m, p = {}) {
      return new Promise(r => {
        const myId = id++;
        const h = d => {
          const res = JSON.parse(d.toString());
          if (res.id === myId) { ws.off('message', h); r(res.result); }
        };
        ws.on('message', h);
        ws.send(JSON.stringify({ id: myId, method: m, params: p }));
      });
    }

    await send('Page.enable');

    // Admin login
    const authData = await new Promise(r => {
      const req = http.request('http://127.0.0.1:3001/auth/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      }, res => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
      });
      req.write(JSON.stringify({ email: 'admin@creamtreat.local', password: 'Admin@CreamTreat2026!' }));
      req.end();
    });

    await send('Page.navigate', { url: 'http://localhost:3000/admin/login' });
    await new Promise(r => setTimeout(r, 1000));
    await send('Runtime.evaluate', {
      expression: `
        sessionStorage.setItem('ct_admin_access_token', ${JSON.stringify(authData.accessToken)});
        sessionStorage.setItem('ct_admin_user', ${JSON.stringify(JSON.stringify(authData.admin))});
      `
    });
    await send('Page.navigate', { url: 'http://localhost:3000/admin/menu' });
    await new Promise(r => setTimeout(r, 2500));

    // Filter by Milkshake category using React native setter
    await send('Runtime.evaluate', {
      expression: `
        const selects = document.querySelectorAll('select');
        const catSelect = Array.from(selects).find(s => Array.from(s.options).some(o => o.text.includes('Milkshake')));
        if (catSelect) {
          const opt = Array.from(catSelect.options).find(o => o.text.includes('Milkshake'));
          if (opt) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
            setter.call(catSelect, opt.value);
            catSelect.dispatchEvent(new Event('input', { bubbles: true }));
            catSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      `
    });
    await new Promise(r => setTimeout(r, 1200));

    const evalRes = await send('Runtime.evaluate', {
      expression: `
        Array.from(document.querySelectorAll('tbody tr')).map((tr, index) => {
          const titleEl = tr.querySelector('p.font-bold') || tr.querySelector('span.font-bold') || tr.children[1];
          const imgEl = tr.querySelector('img');
          return {
            index: index + 1,
            name: titleEl ? titleEl.textContent.trim().split('\\n')[0] : 'Unknown',
            src: imgEl ? imgEl.src : 'NO_IMG'
          };
        })
      `,
      returnByValue: true
    });

    const rows = evalRes.result.value || [];
    console.log('Total rendered rows in table when filtered by Milkshake:', rows.length);
    console.log('\n--- VERIFYING MILKSHAKE ROWS 10 TO 15 ---');
    rows.slice(9, 15).forEach(r => console.log(`#${r.index} ${r.name} -> ${r.src}`));

    // Filter by Mojito category
    await send('Runtime.evaluate', {
      expression: `
        const selects = document.querySelectorAll('select');
        const catSelect = Array.from(selects).find(s => Array.from(s.options).some(o => o.text.includes('Mojito')));
        if (catSelect) {
          const opt = Array.from(catSelect.options).find(o => o.text.includes('Mojito'));
          if (opt) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
            setter.call(catSelect, opt.value);
            catSelect.dispatchEvent(new Event('input', { bubbles: true }));
            catSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      `
    });
    await new Promise(r => setTimeout(r, 1200));

    // Scroll to Sweet Lassi, Mango Lassi, Strawberry Lassi, Rose Lassi
    await send('Runtime.evaluate', {
      expression: `
        const trs = document.querySelectorAll('tbody tr');
        if (trs.length >= 6) {
          trs[4].scrollIntoView({ block: 'start' });
        }
      `
    });
    await new Promise(r => setTimeout(r, 800));
    const mojitoShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(brainDir, 'admin_menu_mojitos_lassis_proof.png'), Buffer.from(mojitoShot.data, 'base64'));
    console.log('Saved admin_menu_mojitos_lassis_proof.png');

    // Filter by Sandwich category
    await send('Runtime.evaluate', {
      expression: `
        const selects = document.querySelectorAll('select');
        const catSelect = Array.from(selects).find(s => Array.from(s.options).some(o => o.text.includes('Sandwich')));
        if (catSelect) {
          const opt = Array.from(catSelect.options).find(o => o.text.includes('Sandwich'));
          if (opt) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
            setter.call(catSelect, opt.value);
            catSelect.dispatchEvent(new Event('input', { bubbles: true }));
            catSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      `
    });
    await new Promise(r => setTimeout(r, 1200));
    const sandwichShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(brainDir, 'admin_menu_sandwiches_proof.png'), Buffer.from(sandwichShot.data, 'base64'));
    console.log('Saved admin_menu_sandwiches_proof.png');

    ws.close();
  } finally {
    proc.kill();
  }
}
test().catch(console.error);
