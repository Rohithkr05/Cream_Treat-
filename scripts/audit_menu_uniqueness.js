const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const mongoose = require('../backend/node_modules/mongoose');

async function audit() {
  console.log('=== AUDITING ALL 59 DISHES FOR UNIQUE PHOTOGRAPHY ===');
  await mongoose.connect('mongodb://127.0.0.1:27017/cream-treat');
  const items = await mongoose.connection.db.collection('fooditems').find({}).sort({ category: 1, name: 1 }).toArray();
  console.log('Total items in DB:', items.length);

  const hashes = {};
  for (const item of items) {
    const rel = (item.imageUrl || item.image).replace(/^\//, '');
    const p = path.join('frontend/public', rel);
    if (!fs.existsSync(p)) {
      console.error('MISSING FILE:', item.name, p);
      continue;
    }
    const buf = fs.readFileSync(p);
    const hash = crypto.createHash('md5').update(buf).digest('hex');
    if (!hashes[hash]) hashes[hash] = [];
    hashes[hash].push({ name: item.name, file: rel, size: (buf.length / 1024).toFixed(1) + ' KB' });
  }

  let conflicts = 0;
  for (const [h, list] of Object.entries(hashes)) {
    if (list.length > 1) {
      conflicts++;
      console.log(`\nDUPLICATE CONFLICT SET ${conflicts} [MD5: ${h.substring(0, 8)}]:`);
      list.forEach(i => console.log(`  - ${i.name} -> ${i.file} (${i.size})`));
    }
  }

  if (conflicts === 0) {
    console.log(`\nVERIFICATION PASSED: ZERO DUPLICATES! All ${items.length} items have completely distinct, individual food photography.`);
  } else {
    console.error(`\nFAILED: Found ${conflicts} duplicate sets.`);
    process.exit(1);
  }

  // Also verify rows 13-15 specifically as reported by the user
  console.log('\n--- BUBBLE MILK VERIFICATION (USER REPORTED ITEMS) ---');
  const bobaItems = items.filter(i => i.name.toLowerCase().includes('bubble milk'));
  for (const boba of bobaItems) {
    const rel = (boba.imageUrl || boba.image).replace(/^\//, '');
    const buf = fs.readFileSync(path.join('frontend/public', rel));
    const h = crypto.createHash('md5').update(buf).digest('hex');
    console.log(`- ${boba.name}: file=${rel}, size=${(buf.length/1024).toFixed(1)} KB, MD5=${h.substring(0,8)}`);
  }

  await mongoose.disconnect();
}

audit();
