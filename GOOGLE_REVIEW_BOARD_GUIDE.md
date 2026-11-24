# Cream Treat — Google Review QR Standee & Sticker Guide

This guide explains how to access, customize, print, and manufacture your physical **Cream Treat Google Review QR Code Boards**.

---

## 1. Where to Find the Review QR Code in the App

You can view and generate the review QR codes in **two ways**:

### Option A: In the Admin Dashboard (Interactive UI)
1. Open your laptop browser and navigate to:
   ```
   http://localhost:3000/admin/reviews
   ```
   *(Or click **"Google Reviews"** with the ⭐ star icon in the admin sidebar navigation).*
2. Here you can:
   - Paste your official **Google Business Review link**.
   - Click **"Test Review Link"** to ensure it opens your Google review pop-up directly.
   - Switch between **4 × 6 Inches**, **A6 Postcard**, and **5 × 5 Inches Square Sticker** layouts.
   - Click **"Download 300 DPI PNG"** to export print-ready high-resolution image files.
   - Click **"Print / Save PDF"** to print directly from your browser.

---

### Option B: Pre-Generated Ready-to-Print Files on Disk
Print-ready vector PDFs and standalone QR codes are saved directly in your project folder:

```
printables/google-reviews/
├── cream-treat-google-review-4x6.pdf            (Vector PDF for 4" × 6" tabletop standees)
├── cream-treat-google-review-a6.pdf             (Vector PDF for A6 international size)
├── cream-treat-google-review-5x5-sticker.pdf    (Vector PDF for 5" × 5" square vinyl stickers)
├── cream-treat-google-review-4x6-qr.png         (High-res standalone QR code)
├── cream-treat-google-review-a6-qr.png          (High-res standalone QR code)
└── cream-treat-google-review-5x5-sticker-qr.png (High-res standalone QR code)
```

---

## 2. How to Insert Your Real Google Review URL

### Step 1: Get Your Short Link from Google
1. Go to **[Google Business Profile](https://business.google.com)** or search your restaurant name **Cream Treat** on **Google Maps**.
2. Click **"Ask for reviews"** or **"Get more reviews"**.
3. Google will provide a short link, for example:
   ```
   https://g.page/r/YOUR_ID/review
   ```
   or
   ```
   https://maps.app.goo.gl/YOUR_ID
   ```

### Step 2: Update Using the CLI Script
You can re-generate all PDF and PNG files with your link in one command from your project terminal:

```bash
node scripts/generate-google-review-board.mjs "https://g.page/r/YOUR_ID/review"
```

All 3 vector PDFs and QR PNGs will automatically update in `printables/google-reviews/`!

---

## 3. Print & Manufacturing Specifications

| Format | Target Dimension | Recommended Material | Best Placement |
| :--- | :--- | :--- | :--- |
| **4 × 6 Inches** | 1200 × 1800 px @ 300 DPI (288 × 432 pt) | 350 GSM Matte Art Card inside a **Clear Acrylic L-Stand** or **T-Stand** | Dining tables, dessert display counters, booths |
| **A6 Postcard** | 1240 × 1748 px @ 300 DPI (297 × 420 pt) | 350 GSM Premium Matte Cardstock with Soft-Touch Lamination | Inside leather bill presentation folders & trays |
| **5 × 5 Inches** | 1500 × 1500 px @ 300 DPI (360 × 360 pt) | **Waterproof Matte Vinyl Decal Sticker** with anti-glare finish | Table corners, payment counters, takeaway cups/bags |

---

## 4. Design & Branding Features
- **Color Palette**: Warm artisanal cream (`#FAF5ED`), dark chocolate typography (`#2C1810`), metallic gold borders (`#D4AF37`), and rich burgundy accents (`#6A0019`).
- **Logo**: Features the official Cream Treat round logo at the top.
- **Rating Stars**: 5 metallic gold stars (`★★★★★`).
- **QR Contrast**: High error correction (`Level H`) enclosed in a pure white protective container box to resist glare under café table lighting.
- **Verbatim Text**:
  - `CREAM TREAT`
  - `ENJOYED YOUR TREAT?`
  - `We'd Love Your Feedback!`
  - `SCAN TO REVIEW US ON GOOGLE`
  - `Your feedback makes us sweeter!`
  - `Thank you for visiting Cream Treat ❤️`
