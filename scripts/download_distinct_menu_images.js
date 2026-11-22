const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const targets = [
  {
    name: 'Chocolate Bubble Milk',
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Ice_bubble_milk_tea_with_tapioca_balls_of_Mister_Donut_in_Japan.jpg',
    files: [
      'frontend/public/menu/chocolate-bubble-milk-v2.jpg',
      'frontend/public/menu/chocolate-bubble-milk.jpg',
      'frontend/public/images/chocolate-bubble-milk-v2.jpg',
      'frontend/public/images/chocolate-bubble-milk.jpg'
    ]
  },
  {
    name: 'Coffee Bubble Milk',
    url: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/PANA_Donuts_Coffee_%26_Boba_Tea_-_May_2022_-_Sarah_Stierch_01.jpg',
    files: [
      'frontend/public/menu/coffee-bubble-milk-v2.jpg',
      'frontend/public/menu/coffee-bubble-milk.jpg',
      'frontend/public/images/coffee-bubble-milk-v2.jpg',
      'frontend/public/images/coffee-bubble-milk.jpg'
    ]
  },
  {
    name: 'Berry Blast Bubble Milk',
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Mister_Donut_Tapioca_Strawberry_Soda.jpg',
    files: [
      'frontend/public/menu/berry-blast-bubble-milk-v2.jpg',
      'frontend/public/menu/berry-blast-bubble-milk.jpg',
      'frontend/public/images/berry-blast-bubble-milk-v2.jpg',
      'frontend/public/images/berry-blast-bubble-milk.jpg'
    ]
  },
  {
    name: 'Sweet Lassi',
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Lassi-MB53.jpg',
    files: [
      'frontend/public/menu/sweet-lassi-v2.jpg',
      'frontend/public/menu/sweet-lassi.jpg',
      'frontend/public/images/sweet-lassi-v2.jpg',
      'frontend/public/images/sweet-lassi.jpg'
    ]
  },
  {
    name: 'Mango Lassi',
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Mango_lassi.jpg',
    files: [
      'frontend/public/menu/mango-lassi-v2.jpg',
      'frontend/public/menu/mango-lassi.jpg',
      'frontend/public/images/mango-lassi-v2.jpg',
      'frontend/public/images/mango-lassi.jpg'
    ]
  },
  {
    name: 'Strawberry Lassi',
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/59/Strawberry_Lassi.jpg',
    files: [
      'frontend/public/menu/strawberry-lassi-v2.jpg',
      'frontend/public/menu/strawberry-lassi.jpg',
      'frontend/public/images/strawberry-lassi-v2.jpg',
      'frontend/public/images/strawberry-lassi.jpg'
    ]
  },
  {
    name: 'Rose Lassi',
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Food-Rose-Lassi.jpg',
    files: [
      'frontend/public/menu/rose-lassi-v2.jpg',
      'frontend/public/menu/rose-lassi.jpg',
      'frontend/public/images/rose-lassi-v2.jpg',
      'frontend/public/images/rose-lassi.jpg'
    ]
  },
  {
    name: 'Vanilla Milkshake',
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Vanilla_milkshake_at_Lunchbox_Laboratories.jpg',
    files: [
      'frontend/public/menu/vanilla-milkshake-v2.jpg',
      'frontend/public/menu/vanilla-milkshake.jpg',
      'frontend/public/images/vanilla-milkshake-v2.jpg',
      'frontend/public/images/vanilla-milkshake.jpg'
    ]
  },
  {
    name: 'Kitkat Milkshake',
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Kitkat_thick_shake.jpg',
    files: [
      'frontend/public/menu/kitkat-milkshake-v2.jpg',
      'frontend/public/menu/kitkat-milkshake.jpg',
      'frontend/public/images/kitkat-milkshake-v2.jpg',
      'frontend/public/images/kitkat-milkshake.jpg'
    ]
  },
  {
    name: 'Salted Caramel Cold Coffee',
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Iced_caramel_latte.jpg',
    files: [
      'frontend/public/menu/salted-caramel-cold-coffee-v2.jpg',
      'frontend/public/menu/salted-caramel-cold-coffee.jpg',
      'frontend/public/images/salted-caramel-cold-coffee-v2.jpg',
      'frontend/public/images/salted-caramel-cold-coffee.jpg'
    ]
  },
  {
    name: 'Cranberry Mojito',
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/98/COCKTAIL_VODKA_CRANBERRY_ICE.jpg',
    files: [
      'frontend/public/menu/cranberry-mojito-v2.jpg',
      'frontend/public/menu/cranberry-mojito.jpg',
      'frontend/public/images/cranberry-mojito-v2.jpg',
      'frontend/public/images/cranberry-mojito.jpg'
    ]
  },
  {
    name: 'Paneer Grilled Sandwich',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Paneer_Tikka_Sandwich_at_New_Diamond_Agra_Stall.jpg',
    files: [
      'frontend/public/menu/paneer-grilled-sandwich.jpg',
      'frontend/public/images/paneer-grilled-sandwich.jpg'
    ]
  },
  {
    name: 'Corn Cheese Sandwich',
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/39/Corn_cheese_Sandwich.jpg',
    files: [
      'frontend/public/menu/corn-cheese-sandwich.jpg',
      'frontend/public/images/corn-cheese-sandwich.jpg'
    ]
  },
  {
    name: 'Pizza Sandwich',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Pizza_Sandwich_by_The_Pizzas_Box_in_Bhopal_Madhya_Pradesh.jpg',
    files: [
      'frontend/public/menu/pizza-sandwich.jpg',
      'frontend/public/images/pizza-sandwich.jpg'
    ]
  },
  {
    name: 'Peri Peri French Fries',
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Peri-Peri_French_Fries.jpg',
    files: [
      'frontend/public/menu/peri-peri-french-fries.jpg',
      'frontend/public/images/peri-peri-french-fries.jpg'
    ]
  },
  {
    name: 'Masala Maggie',
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Vegetable_Maggi_3.jpg',
    files: [
      'frontend/public/menu/masala-maggi.jpg',
      'frontend/public/images/masala-maggi.jpg'
    ]
  },
  {
    name: 'Lemon Coriander Maggie',
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Vegetable_Maggi_4.jpg',
    files: [
      'frontend/public/menu/lemon-coriander-maggi.jpg',
      'frontend/public/images/lemon-coriander-maggi.jpg'
    ]
  },
  {
    name: 'Veg Nuggets',
    url: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Burger_King_Chicken_Nuggets_%2815423233415%29.jpg',
    files: [
      'frontend/public/menu/veg-nuggets.jpg',
      'frontend/public/images/veg-nuggets.jpg'
    ]
  }
];

function downloadBuffer(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects: ' + url));
    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'CreamTreatBot/1.0 (krroh@creamtreat.local)'
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const parsed = new URL(url);
          redirectUrl = new URL(redirectUrl, parsed.origin).toString();
        }
        return resolve(downloadBuffer(redirectUrl, maxRedirects - 1));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status code: ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error(`Timeout downloading ${url}`));
    });
  });
}

async function run() {
  console.log(`Starting download of ${targets.length} distinct item images...`);
  for (const item of targets) {
    process.stdout.write(`Downloading ${item.name}... `);
    try {
      const buf = await downloadBuffer(item.url);
      const hash = crypto.createHash('md5').update(buf).digest('hex');
      console.log(`OK (${(buf.length / 1024).toFixed(1)} KB, MD5: ${hash.substring(0, 8)})`);
      for (const dest of item.files) {
        const fullPath = path.resolve(dest);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, buf);
      }
    } catch (err) {
      console.error(`ERROR downloading ${item.name}:`, err.message);
    }
  }

  // Clear frontend next cache for images
  const nextCacheDir = path.resolve('frontend/.next/cache/images');
  if (fs.existsSync(nextCacheDir)) {
    fs.rmSync(nextCacheDir, { recursive: true, force: true });
    console.log('Cleared Next.js image cache at frontend/.next/cache/images');
  }
  console.log('All downloads completed!');
}

run();
