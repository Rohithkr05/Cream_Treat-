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

async function renderPair() {
  const dir = 'C:/Users/krroh/.gemini/antigravity/brain/87b400db-c065-4106-a512-1d03fdd7e795';
  const b64_coffee = fs.readFileSync(path.join(dir, 'candidate_coffee_bubble_milk.jpg')).toString('base64');
  const b64_berry = fs.readFileSync(path.join(dir, 'candidate_berry_blast_bubble_milk.jpg')).toString('base64');
  
  let html = '<html><body style="background:#18181b;color:#fff;font-family:sans-serif;padding:30px;text-align:center;">';
  html += '<h2>Unbranded Bubble Milk Replacement Candidates</h2>';
  html += '<div style="display:flex;gap:30px;justify-content:center;margin-top:20px;">';
  
  html += '<div style="background:#27272a;padding:15px;border-radius:12px;width:380px;">';
  html += '<img src="data:image/jpeg;base64,' + b64_coffee + '" style="width:100%;height:320px;object-fit:cover;border-radius:8px;" />';
  html += '<h3 style="margin-top:12px;color:#f59e0b;">Coffee Bubble Milk</h3>';
  html += '<p style="font-size:13px;color:#a1a1aa;">Iced latte with brown sugar tapioca boba pearls (Clean, unbranded glass)</p>';
  html += '</div>';

  html += '<div style="background:#27272a;padding:15px;border-radius:12px;width:380px;">';
  html += '<img src="data:image/jpeg;base64,' + b64_berry + '" style="width:100%;height:320px;object-fit:cover;border-radius:8px;" />';
  html += '<h3 style="margin-top:12px;color:#ec4899;">Berry Blast Bubble Milk</h3>';
  html += '<p style="font-size:13px;color:#a1a1aa;">Wild berry / strawberry tapioca drink with pearls (Clean, unbranded glass)</p>';
  html += '</div>';

  html += '</div></body></html>';
  const htmlPath = path.join(dir, 'pair_preview.html');
  fs.writeFileSync(htmlPath, html);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9355;
  const tempProfile = path.join(os.tmpdir(), 'chrome_pair_' + Date.now());
  const proc = spawn(chromePath, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tempProfile, '--window-size=1000,600', 'about:blank']);

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
    await new Promise(r => setTimeout(r, 1200));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(dir, 'unbranded_boba_pair_preview.png'), Buffer.from(shot.data, 'base64'));
    console.log('Saved unbranded_boba_pair_preview.png successfully!');
    ws.close();
  } finally {
    proc.kill();
  }
}
renderPair().catch(console.error);
