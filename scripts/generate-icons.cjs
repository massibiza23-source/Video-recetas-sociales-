const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '../public');

// 1. Standard icon SVG (with rounded corners for standalone viewer / desktop)
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="60%" stop-color="#ea580c" />
      <stop offset="100%" stop-color="#dc2626" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="35%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#7c2d12" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- App icon squircle background -->
  <rect width="512" height="512" rx="116" fill="url(#bg)" />
  <rect width="512" height="512" rx="116" fill="url(#glow)" />

  <!-- Inner delicate border -->
  <rect x="16" y="16" width="480" height="480" rx="100" fill="none" stroke="#ffffff" stroke-width="4" stroke-opacity="0.25" />

  <!-- Center Chef Hat & Culinary Emblem -->
  <g filter="url(#shadow)" transform="translate(256, 250)">
    <!-- Chef Hat Base Band -->
    <path d="M-80 80h160v28a14 14 0 0 1-14 14h-132a14 14 0 0 1-14-14v-28z" fill="#ffffff" fill-opacity="0.25" />
    <path d="M-80 80h160v28a14 14 0 0 1-14 14h-132a14 14 0 0 1-14-14v-28z" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Chef Hat Pleats Lines -->
    <path d="M-48 80v28" stroke="#ffffff" stroke-width="12" stroke-linecap="round" />
    <path d="M0 80v28" stroke="#ffffff" stroke-width="12" stroke-linecap="round" />
    <path d="M48 80v28" stroke="#ffffff" stroke-width="12" stroke-linecap="round" />

    <!-- Chef Hat Cloud/Toque Body -->
    <path d="M-80 80c-22 0-40-18-40-40 0-20 14-36 33-40 1-45 38-80 83-80 15 0 29 4 41 11 11-25 36-43 65-43 39 0 70 30 73 69 22 6 38 26 38 49 0 28-23 50-50 50h-243z" 
          fill="#ffffff" 
          fill-opacity="0.95" 
          stroke="#ffffff" 
          stroke-width="18" 
          stroke-linejoin="round" 
          stroke-linecap="round" />

    <!-- Cutlery / Heart Accent inside hat -->
    <path d="M0 10c-12-14-32-14-44 0-12 14-12 36 0 50l44 44 44-44c12-14 12-36 0-50-12-14-32-14-44 0z" 
          fill="#ea580c" 
          fill-opacity="0.85" 
          transform="translate(4, -10) scale(0.48)" />
  </g>

  <!-- Sparkles top right (AI / extraction magic) -->
  <g transform="translate(378, 108)">
    <path d="M0 -22 L6 -6 L22 0 L6 6 L0 22 L-6 6 L-22 0 L-6 -6 Z" fill="#ffffff" />
  </g>
  <g transform="translate(112, 134) scale(0.6)">
    <path d="M0 -20 L5 -5 L20 0 L5 5 L0 20 L-5 5 L-20 0 L-5 -5 Z" fill="#ffffff" fill-opacity="0.85" />
  </g>
</svg>`;

// 2. Maskable icon SVG (Full bleed, NO rounded corners, all content inside 80% safe-zone)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="60%" stop-color="#ea580c" />
      <stop offset="100%" stop-color="#dc2626" />
    </linearGradient>
    <radialGradient id="glowMask" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
    <filter id="shadowMask" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#7c2d12" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Full-bleed background with no rounded corners for Android maskable compliance -->
  <rect width="512" height="512" fill="url(#bgMask)" />
  <rect width="512" height="512" fill="url(#glowMask)" />

  <!-- Center emblem scaled to fit in safe-zone (radius ~170px = diameter 340px, safe circle is 409px) -->
  <g filter="url(#shadowMask)" transform="translate(256, 254) scale(0.82)">
    <!-- Chef Hat Base Band -->
    <path d="M-80 80h160v28a14 14 0 0 1-14 14h-132a14 14 0 0 1-14-14v-28z" fill="#ffffff" fill-opacity="0.25" />
    <path d="M-80 80h160v28a14 14 0 0 1-14 14h-132a14 14 0 0 1-14-14v-28z" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Chef Hat Pleats Lines -->
    <path d="M-48 80v28" stroke="#ffffff" stroke-width="12" stroke-linecap="round" />
    <path d="M0 80v28" stroke="#ffffff" stroke-width="12" stroke-linecap="round" />
    <path d="M48 80v28" stroke="#ffffff" stroke-width="12" stroke-linecap="round" />

    <!-- Chef Hat Cloud/Toque Body -->
    <path d="M-80 80c-22 0-40-18-40-40 0-20 14-36 33-40 1-45 38-80 83-80 15 0 29 4 41 11 11-25 36-43 65-43 39 0 70 30 73 69 22 6 38 26 38 49 0 28-23 50-50 50h-243z" 
          fill="#ffffff" 
          fill-opacity="0.95" 
          stroke="#ffffff" 
          stroke-width="18" 
          stroke-linejoin="round" 
          stroke-linecap="round" />

    <!-- Heart Accent inside hat -->
    <path d="M0 10c-12-14-32-14-44 0-12 14-12 36 0 50l44 44 44-44c12-14 12-36 0-50-12-14-32-14-44 0z" 
          fill="#ea580c" 
          fill-opacity="0.85" 
          transform="translate(4, -10) scale(0.48)" />
  </g>

  <!-- Subtle Magic Sparkle inside safe zone -->
  <g transform="translate(352, 138) scale(0.85)">
    <path d="M0 -20 L5 -5 L20 0 L5 5 L0 20 L-5 5 L-20 0 L-5 -5 Z" fill="#ffffff" />
  </g>
</svg>`;

// 3. Apple Touch Icon SVG (Full bleed for iOS without transparency)
const appleTouchSvg = maskableSvg;

// 4. Shortcut Icons (Add Recipe & Shopping List)
const shortcutAddSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <rect width="96" height="96" rx="24" fill="#ea580c" />
  <path d="M48 24v48M24 48h48" stroke="#ffffff" stroke-width="8" stroke-linecap="round" />
</svg>`;

const shortcutShoppingSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <rect width="96" height="96" rx="24" fill="#f59e0b" />
  <g fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" transform="translate(16, 18) scale(0.66)">
    <circle cx="28" cy="72" r="6" fill="#ffffff" />
    <circle cx="68" cy="72" r="6" fill="#ffffff" />
    <path d="M4 8h16l14 44h40l12-32H26" />
  </g>
</svg>`;

async function run() {
  console.log('Writing SVGs to public directory...');
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg);

  console.log('Generating high-resolution PNGs...');

  // 1. pwa-512x512.png (any)
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 2. pwa-192x192.png (any)
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 3. pwa-maskable-512x512.png (maskable)
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 4. apple-touch-icon.png (180x180 for iOS Safari)
  await sharp(Buffer.from(appleTouchSvg))
    .resize(180, 180)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 5. favicon-32x32.png
  await sharp(Buffer.from(standardSvg))
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  // 6. Shortcut icons
  await sharp(Buffer.from(shortcutAddSvg))
    .resize(96, 96)
    .png()
    .toFile(path.join(publicDir, 'shortcut-add.png'));

  await sharp(Buffer.from(shortcutShoppingSvg))
    .resize(96, 96)
    .png()
    .toFile(path.join(publicDir, 'shortcut-shopping.png'));

  console.log('All icons generated successfully!');
}

run().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
