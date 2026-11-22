const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
            if (p && p.webSocketDebuggerUrl) { clearInterval(interval); resolve(p.webSocketDebuggerUrl); }
          } catch {}
        });
      }).on('error', () => {});
      if (Date.now() - start > 10000) { clearInterval(interval); reject(new Error('timeout')); }
    }, 200);
  });
}

async function renderComparison() {
  const dir = 'C:/Users/krroh/.gemini/antigravity/brain/87b400db-c065-4106-a512-1d03fdd7e795/boba_test';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg'));
  
  let html = '<html><body style="background:#111;color:#fff;font-family:sans-serif;padding:20px;">';
  html += '<h2 style="text-align:center;">Boba Candidates Inspection</h2>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:center;">';
  for (const f of files) {
    const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
    html += '<div style="background:#222;padding:10px;border-radius:8px;text-align:center;width:340px;">';
    html += '<img src="data:image/jpeg;base64,' + b64 + '" style="width:100%;height:240px;object-fit:cover;border-radius:4px;" />';
    html += '<p style="font-size:14px;margin-top:8px;">' + f + '</p>';
    html += '</div>';
  }
  html += '</div></body></html>';
  const htmlPath = path.join(dir, 'preview.html');
  fs.writeFileSync(htmlPath, html);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9344;
  const tempProfile = path.join(os.tmpdir(), 'chrome_boba_' + Date.now());
  const proc = spawn(chromePath, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tempProfile, '--window-size=1280,1100', 'about:blank']);

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
    const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
    await send('Page.navigate', { url: fileUrl });
    await new Promise(r => setTimeout(r, 1500));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/Users/krroh/.gemini/antigravity/brain/87b400db-c065-4106-a512-1d03fdd7e795/boba_candidates_preview.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved boba_candidates_preview.png!');
    ws.close();
  } finally {
    proc.kill();
  }
}
renderComparison().catch(console.error);
