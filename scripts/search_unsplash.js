const https = require('https');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function searchUnsplash(query) {
  const html = await fetchText('https://unsplash.com/s/photos/' + encodeURIComponent(query));
  const regex = /https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9\-_]+/g;
  const matches = html.match(regex) || [];
  const unique = Array.from(new Set(matches));
  return unique.slice(0, 8);
}

async function run() {
  const coffee = await searchUnsplash('boba-coffee');
  console.log('Unsplash coffee boba:');
  coffee.forEach(c => console.log('  -', c));

  const berry = await searchUnsplash('strawberry-boba');
  console.log('\nUnsplash strawberry boba:');
  berry.forEach(b => console.log('  -', b));
}

run().catch(console.error);
