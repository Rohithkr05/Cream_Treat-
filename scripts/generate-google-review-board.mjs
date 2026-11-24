import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const PDFDocument = require('../backend/node_modules/pdfkit/js/pdfkit.js');
const QRCode = require('../frontend/node_modules/qrcode');

// Root and output paths
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'printables', 'google-reviews');
const LOGO_PATH = path.join(ROOT_DIR, 'frontend', 'public', 'images', 'cream-treat-logo.jpg');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// User-provided or default Google Review URL
const REVIEW_URL = process.argv[2] || process.env.GOOGLE_REVIEW_URL || 'https://search.google.com/local/writereview?placeid=ChIJCreamTreatCafe';

console.log('Generating Cream Treat Google Review Boards...');
console.log(`Target URL: ${REVIEW_URL}`);
console.log(`Output Directory: ${OUTPUT_DIR}\n`);

// Color Palette
const COLORS = {
  cream: '#FAF5ED',
  creamDark: '#F4ECE1',
  chocolate: '#2C1810',
  burgundy: '#6A0019',
  gold: '#D4AF37',
  goldDark: '#B8860B',
  white: '#FFFFFF',
  heart: '#E53935',
  subtle: '#665C54',
};

/**
 * Format specifications:
 * 4x6: 4 x 6 inches = 288 x 432 pt @ 72 DPI
 * A6: 105 x 148 mm = 297.64 x 419.53 pt @ 72 DPI
 * 5x5: 5 x 5 inches = 360 x 360 pt @ 72 DPI
 */
const FORMATS = {
  '4x6': {
    name: 'cream-treat-google-review-4x6',
    title: '4 × 6 Inches Portrait Standee',
    width: 288,
    height: 432,
    qrSize: 130,
    logoWidth: 54,
  },
  'a6': {
    name: 'cream-treat-google-review-a6',
    title: 'A6 Postcard / Table Stand',
    width: 297.64,
    height: 419.53,
    qrSize: 126,
    logoWidth: 52,
  },
  '5x5': {
    name: 'cream-treat-google-review-5x5-sticker',
    title: '5 × 5 Inches Square Sticker',
    width: 360,
    height: 360,
    qrSize: 128,
    logoWidth: 48,
  },
};

/**
 * Generates high-res QR code image buffer
 */
async function generateQrBuffer(url, size = 1000) {
  return await QRCode.toBuffer(url, {
    errorCorrectionLevel: 'H', // High error correction for table/acrylic durability
    type: 'png',
    margin: 2,
    width: size,
    color: {
      dark: '#2C1810', // Rich dark chocolate for brand harmony and crisp scanning
      light: '#FFFFFF',
    },
  });
}

/**
 * Draws 5 metallic gold review stars
 */
function drawFiveStars(doc, centerX, y, starSize = 11, spacing = 5) {
  const totalWidth = 5 * starSize + 4 * spacing;
  let startX = centerX - totalWidth / 2;

  for (let i = 0; i < 5; i++) {
    const x = startX + i * (starSize + spacing);
    doc.save();
    doc.fillColor(COLORS.gold);
    doc.fontSize(starSize);
    doc.text('★', x, y, { lineBreak: false });
    doc.restore();
  }
}

/**
 * Builds a vector PDF for a given format
 */
async function buildPdf(formatKey, qrBuffer) {
  const spec = FORMATS[formatKey];
  const pdfPath = path.join(OUTPUT_DIR, `${spec.name}.pdf`);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [spec.width, spec.height],
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      info: {
        Title: `Cream Treat Google Review Board - ${spec.title}`,
        Author: 'Cream Treat',
        Subject: 'Customer Review QR Standee',
      },
    });

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // 1. Full Page Background
    doc.rect(0, 0, spec.width, spec.height).fill(COLORS.cream);

    // 2. Double Border (Outer thin, inner accent)
    const m1 = 10;
    const m2 = 14;
    doc.lineWidth(1.2).strokeColor(COLORS.gold).rect(m1, m1, spec.width - 2 * m1, spec.height - 2 * m1).stroke();
    doc.lineWidth(0.5).strokeColor(COLORS.goldDark).rect(m2, m2, spec.width - 2 * m2, spec.height - 2 * m2).stroke();

    // Corner decorative marks
    const cSize = 6;
    doc.save().lineWidth(1).strokeColor(COLORS.gold);
    // top-left
    doc.moveTo(m1 + 2, m1 + 2).lineTo(m1 + 2 + cSize, m1 + 2).stroke();
    doc.moveTo(m1 + 2, m1 + 2).lineTo(m1 + 2, m1 + 2 + cSize).stroke();
    // top-right
    doc.moveTo(spec.width - m1 - 2, m1 + 2).lineTo(spec.width - m1 - 2 - cSize, m1 + 2).stroke();
    doc.moveTo(spec.width - m1 - 2, m1 + 2).lineTo(spec.width - m1 - 2, m1 + 2 + cSize).stroke();
    // bottom-left
    doc.moveTo(m1 + 2, spec.height - m1 - 2).lineTo(m1 + 2 + cSize, spec.height - m1 - 2).stroke();
    doc.moveTo(m1 + 2, spec.height - m1 - 2).lineTo(m1 + 2, spec.height - m1 - 2 - cSize).stroke();
    // bottom-right
    doc.moveTo(spec.width - m1 - 2, spec.height - m1 - 2).lineTo(spec.width - m1 - 2 - cSize, spec.height - m1 - 2).stroke();
    doc.moveTo(spec.width - m1 - 2, spec.height - m1 - 2).lineTo(spec.width - m1 - 2, spec.height - m1 - 2 - cSize).stroke();
    doc.restore();

    const centerX = spec.width / 2;
    let currentY = formatKey === '5x5' ? 22 : 25;

    // 3. Logo (if exists)
    if (fs.existsSync(LOGO_PATH)) {
      try {
        const logoX = centerX - spec.logoWidth / 2;
        doc.image(LOGO_PATH, logoX, currentY, { width: spec.logoWidth });
        currentY += spec.logoWidth + (formatKey === '5x5' ? 4 : 7);
      } catch (err) {
        currentY += 10;
      }
    }

    // 4. "CREAM TREAT" Header
    doc.font('Helvetica-Bold')
      .fontSize(formatKey === '5x5' ? 14 : 16)
      .fillColor(COLORS.chocolate)
      .text('CREAM TREAT', 0, currentY, {
        align: 'center',
        width: spec.width,
        characterSpacing: 2,
      });

    currentY += (formatKey === '5x5' ? 17 : 20);

    // 5. "ENJOYED YOUR TREAT?"
    doc.font('Helvetica-Bold')
      .fontSize(formatKey === '5x5' ? 11 : 12)
      .fillColor(COLORS.burgundy)
      .text('ENJOYED YOUR TREAT?', 0, currentY, {
        align: 'center',
        width: spec.width,
        characterSpacing: 1,
      });

    currentY += (formatKey === '5x5' ? 15 : 18);

    // 6. "We'd Love Your Feedback!"
    doc.font('Helvetica-Oblique')
      .fontSize(formatKey === '5x5' ? 11 : 12.5)
      .fillColor(COLORS.chocolate)
      .text("We'd Love Your Feedback!", 0, currentY, {
        align: 'center',
        width: spec.width,
      });

    currentY += (formatKey === '5x5' ? 15 : 18);

    // 7. Five Gold Stars
    drawFiveStars(doc, centerX, currentY, formatKey === '5x5' ? 11 : 12, 5);
    currentY += (formatKey === '5x5' ? 16 : 19);

    // 8. White QR Container Box with Gold Border & Shadow effect
    const qrBoxPadding = 8;
    const qrBoxSize = spec.qrSize + qrBoxPadding * 2;
    const qrBoxX = centerX - qrBoxSize / 2;
    const qrBoxY = currentY;

    // Soft border box
    doc.save()
      .rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize)
      .fill(COLORS.white)
      .lineWidth(1)
      .strokeColor(COLORS.gold)
      .rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize)
      .stroke()
      .restore();

    // Embedded QR Code
    doc.image(qrBuffer, qrBoxX + qrBoxPadding, qrBoxY + qrBoxPadding, {
      width: spec.qrSize,
      height: spec.qrSize,
    });

    currentY += qrBoxSize + (formatKey === '5x5' ? 10 : 14);

    // 9. "SCAN TO REVIEW US ON GOOGLE" Pill / Banner
    const pillPaddingX = 14;
    const pillHeight = formatKey === '5x5' ? 19 : 22;
    doc.font('Helvetica-Bold').fontSize(formatKey === '5x5' ? 8.5 : 9.5);
    const pillText = 'SCAN TO REVIEW US ON GOOGLE';
    const textWidth = doc.widthOfString(pillText, { characterSpacing: 1 });
    const pillWidth = textWidth + pillPaddingX * 2;
    const pillX = centerX - pillWidth / 2;

    doc.save()
      .roundedRect(pillX, currentY, pillWidth, pillHeight, 4)
      .fill(COLORS.chocolate)
      .restore();

    doc.fillColor(COLORS.cream)
      .text(pillText, 0, currentY + (formatKey === '5x5' ? 5 : 6), {
        align: 'center',
        width: spec.width,
        characterSpacing: 1,
      });

    currentY += pillHeight + (formatKey === '5x5' ? 10 : 14);

    // 10. "Your feedback makes us sweeter!"
    doc.font('Helvetica-Oblique')
      .fontSize(formatKey === '5x5' ? 9.5 : 10.5)
      .fillColor(COLORS.chocolate)
      .text('Your feedback makes us sweeter!', 0, currentY, {
        align: 'center',
        width: spec.width,
      });

    currentY += (formatKey === '5x5' ? 14 : 17);

    // 11. "Thank you for visiting Cream Treat ❤️"
    doc.font('Helvetica-Bold')
      .fontSize(formatKey === '5x5' ? 9 : 10)
      .fillColor(COLORS.burgundy)
      .text('Thank you for visiting Cream Treat  ❤', 0, currentY, {
        align: 'center',
        width: spec.width,
      });

    doc.end();

    stream.on('finish', () => {
      console.log(`✓ Generated Vector PDF: ${pdfPath}`);
      resolve(pdfPath);
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  try {
    // Generate QR buffers
    const qrHighRes = await generateQrBuffer(REVIEW_URL, 1200);

    // Save individual QR codes for print shop graphics integration
    for (const key of Object.keys(FORMATS)) {
      const qrPath = path.join(OUTPUT_DIR, `${FORMATS[key].name}-qr.png`);
      fs.writeFileSync(qrPath, qrHighRes);
      console.log(`✓ Generated standalone QR code: ${qrPath}`);
    }

    // Build all 3 vector PDFs
    for (const key of Object.keys(FORMATS)) {
      await buildPdf(key, qrHighRes);
    }

    console.log('\nAll Google Review boards generated successfully!');
  } catch (error) {
    console.error('Generation failed:', error);
    process.exit(1);
  }
}

run();
