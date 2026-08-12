const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function buildIcon() {
  const svgPath = path.join(__dirname, '../src/logo.svg');
  const iconDest = path.join(__dirname, 'icon.png');
  const trayDest = path.join(__dirname, 'tray-icon.png');

  console.log(`Rendering high-fidelity taskbar/window icon using Sharp from: ${svgPath}`);
  try {
    if (!fs.existsSync(svgPath)) {
      throw new Error(`SVG file not found at ${svgPath}`);
    }

    // 1. Taskbar/Window Icon (512x512) - Unchanged for taskbar rendering
    await sharp(svgPath)
      .trim()
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(iconDest);

    console.log(`Success! Rendered custom SVG for taskbar icon: ${iconDest}`);

    // 2. System Tray Icon (256x256) - Scaled to fill height & width boldly in the tray area
    const trimmedBuf = await sharp(svgPath).trim().toBuffer();
    const scaleWidth = 360;
    const scaleHeight = 238;

    await sharp(trimmedBuf)
      .resize(scaleWidth, scaleHeight)
      .extract({
        left: Math.round((scaleWidth - 256) / 2),
        top: 0,
        width: 256,
        height: scaleHeight
      })
      .extend({
        top: Math.floor((256 - scaleHeight) / 2),
        bottom: Math.ceil((256 - scaleHeight) / 2),
        left: 0,
        right: 0,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(trayDest);

    console.log(`Success! Rendered custom SVG for system tray icon: ${trayDest}`);
  } catch (err) {
    console.error('Error generating icons via Sharp:', err);
    if (fs.existsSync(iconDest)) {
      console.log('electron/icon.png already exists, continuing build.');
    }
  }
}

buildIcon();
