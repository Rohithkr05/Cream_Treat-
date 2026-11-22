const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'CreamTreatBot/1.0 (krroh@creamtreat.local)' } }, res => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function search(q) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=' + encodeURIComponent(q) + '&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=800&gsrlimit=20&format=json';
  const data = await fetchJson(url);
  const pages = Object.values(data.query?.pages || {});
  return pages
    .filter(p => p.title && !p.title.endsWith('.pdf') && !p.title.endsWith('.svg'))
    .map(p => ({ title: p.title, url: p.imageinfo?.[0]?.thumburl || p.imageinfo?.[0]?.url }));
}

async function run() {
  const res = await search('bubble tea glass');
  console.log('Results (' + res.length + '):');
  res.forEach(r => console.log('  -', r.title, '->', r.url));

  const res2 = await search('boba glass tapioca');
  console.log('\nResults 2 (' + res2.length + '):');
  res2.forEach(r => console.log('  -', r.title, '->', r.url));
}
run();
