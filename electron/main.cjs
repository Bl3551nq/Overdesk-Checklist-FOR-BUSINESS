const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const crypto = require('crypto');
const os = require('os');

// Keep variables in higher scope to prevent garbage collection
let mainWindow = null;
let tray = null;
let isQuitting = false;
let cachedX = null;
let cachedY = null;
let cachedScale = null;
let configCache = null;
let isProgrammaticBoundsUpdate = false;
let programmaticTimeout = null;
let isScaling = false;
let scaleAnchorX = null;
let scaleAnchorY = null;
const configPath = path.join(app.getPath('userData'), 'app-config.json');

// Helper to read config
function readConfig() {
  if (configCache) return configCache;
  try {
    if (fs.existsSync(configPath)) {
      configCache = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return configCache;
    }
  } catch (err) {
    console.error('Error reading config:', err);
  }
  configCache = {};
  return configCache;
}

// Helper to write config
let writeTimeout = null;
function writeConfig(data) {
  try {
    const current = readConfig();
    configCache = { ...current, ...data };
    
    if (writeTimeout) clearTimeout(writeTimeout);
    writeTimeout = setTimeout(() => {
      try {
        fs.writeFileSync(configPath, JSON.stringify(configCache, null, 2), 'utf8');
      } catch (err) {
        console.error('Error writing config:', err);
      }
    }, 500); // 500ms debounce
  } catch (err) {
    console.error('Error in writeConfig queue:', err);
  }
}

function createWindow() {
  const config = readConfig();
  const savedScale = config.scale || 1.0;
  cachedScale = savedScale;
  
  // Custom sizing math fitting our card size with ample transparent padding for soft blurred drop-shadows
  const initialWidth = Math.round((320 + 120) * savedScale);
  const initialHeight = Math.round((480 + 140) * savedScale);

  const windowOptions = {
    width: initialWidth,
    height: initialHeight,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: true, // Set to true to bypass OS/Win32 boundary positioning restrictions
    maximizable: false, // Prevent maximize behavior to sustain checklist aspect ratio
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  };

  // Restore saved coordinates if loaded correctly, or default to top center of screen on fresh install
  if (typeof config.x === 'number' && typeof config.y === 'number') {
    windowOptions.x = config.x;
    windowOptions.y = config.y;
    cachedX = config.x;
    cachedY = config.y;
  } else {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { workArea } = primaryDisplay;
      const defaultX = Math.round(workArea.x + (workArea.width - initialWidth) / 2);
      const defaultY = Math.round(workArea.y + 10);
      windowOptions.x = defaultX;
      windowOptions.y = defaultY;
      cachedX = defaultX;
      cachedY = defaultY;
    } catch (e) {
      console.error('Error fetching primary display bounds:', e);
    }
  }

  // Load appropriate application icon
  const customIconPath = path.join(app.getPath('userData'), 'icon.png');
  const packagedIconPath = path.join(__dirname, 'icon.png');
  if (fs.existsSync(customIconPath)) {
    windowOptions.icon = customIconPath;
  } else if (fs.existsSync(packagedIconPath)) {
    windowOptions.icon = packagedIconPath;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Enforce high-priority always-on-top level so widget stays above all windows
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  if (process.platform === 'darwin') {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  // Load from local static build or development server
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools in dev mode if needed for debugging
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Save coordinates when window moves (only if NOT programmatic resize/drag scale)
  let moveTimeout;
  mainWindow.on('move', () => {
    if (isProgrammaticBoundsUpdate || isScaling) return;
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition();
      cachedX = x;
      cachedY = y;
    }
    if (moveTimeout) clearTimeout(moveTimeout);
    moveTimeout = setTimeout(() => {
      if (isProgrammaticBoundsUpdate || isScaling) return;
      if (mainWindow) {
        const [x, y] = mainWindow.getPosition();
        cachedX = x;
        cachedY = y;
        writeConfig({ x, y });
      }
    }, 300);
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Check for auto updates once window displays (silently without native popups)
  mainWindow.once('ready-to-show', () => {
    if (!isDev) {
      autoUpdater.checkForUpdates().catch(err => {
        console.error('Error checking for updates silently:', err);
      });
    }
  });
}

function createTray() {
  const customTrayPath = path.join(app.getPath('userData'), 'tray-icon.png');
  const customIconPath = path.join(app.getPath('userData'), 'icon.png');
  const packagedTrayPath = path.join(__dirname, 'tray-icon.png');
  const packagedIconPath = path.join(__dirname, 'icon.png');

  let iconPath = packagedTrayPath;
  if (fs.existsSync(customTrayPath)) {
    iconPath = customTrayPath;
  } else if (!fs.existsSync(packagedTrayPath) && fs.existsSync(customIconPath)) {
    iconPath = customIconPath;
  } else if (!fs.existsSync(packagedTrayPath) && fs.existsSync(packagedIconPath)) {
    iconPath = packagedIconPath;
  }

  let trayIcon;
  if (fs.existsSync(iconPath)) {
    // Windows & Linux support High-DPI taskbar tray icons (up to 64x64). macOS menu bar icon standard is 22x22.
    if (process.platform === 'win32') {
      trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 32, height: 32, quality: 'best' });
    } else if (process.platform === 'darwin') {
      trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 22, height: 22, quality: 'best' });
      trayIcon.setTemplateImage(true);
    } else {
      trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 32, height: 32, quality: 'best' });
    }
  } else {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide App',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
            mainWindow.focus();
          }
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Overdesk Everyone');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });
}

// Configure autoUpdater - silent updates without intrusive popups
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info.version);
  }
});

autoUpdater.on('update-not-available', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available');
  }
});

autoUpdater.on('error', (err) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err ? err.message : 'Update check failed');
  }
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded');
  }
  // Install silently automatically after download completes
  setTimeout(() => {
    try {
      autoUpdater.quitAndInstall(false, true);
    } catch (e) {
      console.error('Error quitting and installing update silently:', e);
    }
  }, 2000);
});

ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { ok: true, version: result?.updateInfo?.version };
  } catch (err) {
    return { ok: false, error: err ? err.message : 'Check failed' };
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Automatically check for and silently download updates in background on launch
  setTimeout(() => {
    try {
      autoUpdater.checkForUpdates().catch((err) => {
        console.log('[AutoUpdater] Silent launch check:', err?.message || err);
      });
    } catch (e) {}
  }, 4000);

  // Periodically check for updates automatically every 2 hours
  setInterval(() => {
    try {
      autoUpdater.checkForUpdates().catch((err) => {
        console.log('[AutoUpdater] Silent periodic check:', err?.message || err);
      });
    } catch (e) {}
  }, 2 * 60 * 60 * 1000);

  // Ensure default auto-launch behavior on startup (or restore saved preference)
  try {
    const config = readConfig();
    const shouldAutoLaunch = config.autoLaunch !== undefined ? !!config.autoLaunch : true;
    app.setLoginItemSettings({
      openAtLogin: shouldAutoLaunch,
      openAsHidden: false,
      name: 'Overdesk Everyone',
    });
  } catch (err) {
    console.error('Error initializing auto-launch on startup:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Keep the app process alive in the system tray area
});

/* ═══════════════════════════════════════════════════════
   IPC HANDLERS (License & Trial Validation & Window Controls)
═══════════════════════════════════════════════════════ */

// Helper to parse Gumroad option or variant type
function parseGumroadPurchaseType(purchase) {
  if (!purchase) return { isLifetime: false, isTrial: false, type: 'annual', expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000 };

  const optName = String(purchase.option_name || '').toLowerCase();
  const variantsStr = JSON.stringify(purchase.variants || {}).toLowerCase();
  const variantAttrStr = JSON.stringify(purchase.variant_attributes || {}).toLowerCase();
  const fullText = `${optName} ${variantsStr} ${variantAttrStr}`;

  // Option identifiers from Gumroad URLs:
  // Lifetime option: guYugE2gou1zWkk_pMNJKQ==
  // Annual option: qvvEn2GSxn01Xog_D17QLg==
  // Trial option: cW7dAxozIPA2o1SZUWsQRw==

  // 1. Strict Trial identification
  const isTrial = fullText.includes('cw7daxozipa2o1szuwsqrw') ||
                  fullText.includes('trial') ||
                  fullText.includes('free trial') ||
                  fullText.includes('5-day');

  if (isTrial) {
    const createdAtMs = purchase.created_at ? new Date(purchase.created_at).getTime() : Date.now();
    const trialExpiresAt = createdAtMs + (5 * 24 * 60 * 60 * 1000);
    return { isLifetime: false, isTrial: true, type: 'trial', expiresAt: trialExpiresAt };
  }

  // 2. Strict Lifetime identification
  const isLifetime = fullText.includes('guyuge2gou1zwkk') ||
                     fullText.includes('lifetime') ||
                     fullText.includes('life-time') ||
                     fullText.includes('permanent');

  if (isLifetime) {
    return { isLifetime: true, isTrial: false, type: 'lifetime', expiresAt: null };
  }

  // 3. Annual / Subscription option
  let expiresAt = null;
  if (purchase.subscription_ended_at) {
    expiresAt = new Date(purchase.subscription_ended_at).getTime();
  } else if (purchase.created_at) {
    const createdAtMs = new Date(purchase.created_at).getTime();
    if (!isNaN(createdAtMs)) {
      expiresAt = createdAtMs + (365 * 24 * 60 * 60 * 1000); // 1 year
    }
  }

  if (!expiresAt || isNaN(expiresAt)) {
    expiresAt = Date.now() + (365 * 24 * 60 * 60 * 1000);
  }

  return { isLifetime: false, isTrial: false, type: 'annual', expiresAt };
}

// Check if license or trial is active
ipcMain.handle('check-license', () => {
  const config = readConfig();
  const currentMachineId = getMachineId();
  const licenseDevicePath = path.join(app.getPath('userData'), 'license-device.enc');

  let trialStartedAt = config.trialStartedAt || null;
  let trialUsed = config.trialUsed || false;
  let storedLicenseKey = config.licenseKey || null;

  // Verify encrypted device file for machine persistent trial/license records
  if (fs.existsSync(licenseDevicePath)) {
    try {
      const encryptedData = fs.readFileSync(licenseDevicePath, 'utf8').trim();
      const decrypted = decryptData(encryptedData);
      if (decrypted) {
        const parsed = JSON.parse(decrypted);
        if (parsed.trialStartedAt) {
          trialStartedAt = parsed.trialStartedAt;
          trialUsed = true;
        }
        if (parsed.trialUsed) {
          trialUsed = true;
        }
        if (parsed.licenseKey && !storedLicenseKey) {
          storedLicenseKey = parsed.licenseKey;
        }
      }
    } catch (e) {}
  }

  // 1. Check paid or registered key status
  if (config.licenseValid && (config.licenseKey || storedLicenseKey)) {
    // If the registered key was a trial license
    if (config.licenseType === 'trial') {
      const trialExpiresAt = config.licenseExpiresAt || (trialStartedAt ? trialStartedAt + (5 * 24 * 60 * 60 * 1000) : 0);
      if (trialExpiresAt && Date.now() <= trialExpiresAt) {
        const daysLeft = Math.ceil((trialExpiresAt - Date.now()) / (1000 * 60 * 60 * 24));
        return {
          ok: true,
          type: 'trial',
          trialActive: true,
          trialUsed: true,
          trialDaysLeft: daysLeft,
          trialExpiresAt
        };
      } else {
        writeConfig({ licenseValid: false });
        return {
          ok: false,
          type: 'trial_expired',
          trialActive: false,
          trialUsed: true,
          expiredMessage: 'Your 5-day free trial has expired. Please purchase a license to continue.'
        };
      }
    }

    // If Annual subscription
    if (config.licenseType === 'annual' || (typeof config.licenseExpiresAt === 'number' && config.licenseExpiresAt > 0)) {
      if (Date.now() <= config.licenseExpiresAt) {
        const daysLeft = Math.ceil((config.licenseExpiresAt - Date.now()) / (1000 * 60 * 60 * 24));
        return { ok: true, type: 'annual', isLifetime: false, expiresAt: config.licenseExpiresAt, daysLeft, key: config.licenseKey, trialUsed };
      } else {
        // Annual license key expired
        writeConfig({ licenseValid: false });
        return {
          ok: false,
          type: 'expired',
          trialUsed: true,
          expiredMessage: 'Your annual license key has expired. Please enter a valid license or purchase a new one at overdesk.store.'
        };
      }
    }

    // Genuine lifetime licenses (or previous valid license config)
    if (config.licenseType === 'lifetime' || !config.licenseType) {
      return { ok: true, type: 'lifetime', isLifetime: true, key: config.licenseKey || storedLicenseKey, trialUsed };
    }
  }

  // 2. Check 5-day in-app trial status
  if (trialStartedAt) {
    const trialExpiresAt = trialStartedAt + (5 * 24 * 60 * 60 * 1000); // 5 days ms
    if (Date.now() <= trialExpiresAt) {
      const daysLeft = Math.ceil((trialExpiresAt - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        ok: true,
        type: 'trial',
        trialActive: true,
        trialUsed: true,
        trialDaysLeft: daysLeft,
        trialExpiresAt
      };
    } else {
      // Trial expired
      return {
        ok: false,
        type: 'trial_expired',
        trialActive: false,
        trialUsed: true,
        expiredMessage: 'Your 5-day free trial has expired. Please purchase a license to continue.'
      };
    }
  }

  // 3. No license, trial not started yet -> Show License Page with Start Trial
  return {
    ok: false,
    type: 'none',
    trialActive: false,
    trialUsed: trialUsed
  };
});

// Start 5-day Trial IPC
ipcMain.handle('start-trial', () => {
  const config = readConfig();
  const currentMachineId = getMachineId();
  const licenseDevicePath = path.join(app.getPath('userData'), 'license-device.enc');

  let trialStartedAt = config.trialStartedAt || null;
  let trialUsed = config.trialUsed || false;

  if (fs.existsSync(licenseDevicePath)) {
    try {
      const encryptedData = fs.readFileSync(licenseDevicePath, 'utf8').trim();
      const decrypted = decryptData(encryptedData);
      if (decrypted) {
        const parsed = JSON.parse(decrypted);
        if (parsed.trialStartedAt || parsed.trialUsed) {
          trialStartedAt = parsed.trialStartedAt || trialStartedAt;
          trialUsed = true;
        }
      }
    } catch (e) {}
  }

  if (trialUsed || trialStartedAt) {
    return {
      ok: false,
      trialUsed: true,
      error: 'Your free trial has already been used. Please purchase a license to continue.'
    };
  }

  const now = Date.now();
  const expiresAt = now + (5 * 24 * 60 * 60 * 1000);

  writeConfig({ trialStartedAt: now, trialUsed: true });

  try {
    const dataToEncrypt = JSON.stringify({
      machineId: currentMachineId,
      trialStartedAt: now,
      trialUsed: true
    });
    const encryptedStr = encryptData(dataToEncrypt);
    fs.writeFileSync(licenseDevicePath, encryptedStr, 'utf8');
  } catch (err) {
    console.error('Failed to save device trial record:', err);
  }

  return {
    ok: true,
    trialStartedAt: now,
    trialExpiresAt: expiresAt,
    daysLeft: 5
  };
});

function getMachineId() {
  try {
    const cpuModel = (os.cpus() && os.cpus().length > 0) ? os.cpus()[0].model : 'unknown-cpu';
    const raw = [
      String(os.hostname() || 'unknown-host'),
      String(os.platform() || 'unknown-platform'),
      String(os.arch() || 'unknown-arch'),
      String(cpuModel),
      String(os.totalmem() || '0'),
    ].join('|');
    return crypto.createHash('sha256').update(raw).digest('hex');
  } catch (e) {
    return crypto.createHash('sha256').update('fallback-machine-id').digest('hex');
  }
}

const ENCRYPTION_KEY = crypto.scryptSync('overdesk-license-key-salt', 'salt', 32);
const IV = Buffer.alloc(16, 0);

function encryptData(dataStr) {
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  let encrypted = cipher.update(dataStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptData(encryptedHex) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return null;
  }
}

// Gumroad License verify
ipcMain.handle('validate-license', async (event, rawKey) => {
  const licenseKey = rawKey.trim();
  const normalizedKey = licenseKey.toUpperCase();
  const cleanedKey = normalizedKey.replace(/[^A-Z0-9]/g, '');

  // Support offline/testing authorization override keys
  if (
    normalizedKey === 'TEST-LICENSE-KEY' ||
    normalizedKey === 'TEST-LIFETIME-KEY' ||
    normalizedKey === 'OVERDESK-LIFETIME-TEST' ||
    normalizedKey === 'OVERDESK-TEST-KEY-2026' ||
    normalizedKey === 'TEST-1234-5678-90AB-CDEF-1234-5678'
  ) {
    writeConfig({ licenseValid: true, licenseKey, licenseType: 'lifetime', licenseExpiresAt: null });
    return { ok: true, test: true, type: 'lifetime', isLifetime: true, expiresAt: null };
  }

  if (normalizedKey === 'TEST-ANNUAL-KEY') {
    const expiresAt = Date.now() + (365 * 24 * 60 * 60 * 1000);
    writeConfig({ licenseValid: true, licenseKey, licenseType: 'annual', licenseExpiresAt: expiresAt });
    return { ok: true, test: true, type: 'annual', isLifetime: false, expiresAt };
  }

  if (normalizedKey === 'TEST-TRIAL-KEY' || normalizedKey === 'TEST-TRIAL-EXPIRED') {
    const isExpired = normalizedKey === 'TEST-TRIAL-EXPIRED';
    const expiresAt = isExpired ? Date.now() - 1000 : Date.now() + (5 * 24 * 60 * 60 * 1000);
    if (isExpired) {
      return { ok: false, error: 'This trial key has expired (5-day limit reached). Please purchase a lifetime or annual license at overdesk.store.' };
    }
    writeConfig({ licenseValid: true, licenseKey, licenseType: 'trial', licenseExpiresAt: expiresAt, trialStartedAt: Date.now(), trialUsed: true });
    return { ok: true, test: true, type: 'trial', isLifetime: false, trialActive: true, trialDaysLeft: 5, expiresAt };
  }

  // Attempt to load Gumroad config from package.json dynamically so developers can override without editing code
  let productId = 'njBrop7enJxgaZWr4Y7-dQ==';
  let accessToken = '';
  let usePermalink = false;

  try {
    const pkgPath = path.join(__dirname, '../package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.gumroad) {
        if (pkg.gumroad.product_id) {
          productId = pkg.gumroad.product_id;
          usePermalink = false;
        } else if (pkg.gumroad.product_permalink) {
          productId = pkg.gumroad.product_permalink;
          usePermalink = true;
        }
        if (pkg.gumroad.access_token !== undefined) {
          accessToken = pkg.gumroad.access_token;
        }
      }
    }
  } catch (pkgErr) {
    console.error('Error reading package.json for Gumroad configuration, using defaults:', pkgErr);
  }

  const currentMachineId = getMachineId();
  const licenseDevicePath = path.join(app.getPath('userData'), 'license-device.enc');
  let hasFirstActivated = false;
  let storedMachineId = '';

  if (fs.existsSync(licenseDevicePath)) {
    try {
      const encryptedData = fs.readFileSync(licenseDevicePath, 'utf8').trim();
      const decrypted = decryptData(encryptedData);
      if (decrypted) {
        const parsed = JSON.parse(decrypted);
        if (parsed.machineId && parsed.licenseKey) {
          const storedKeyMatch = parsed.licenseKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (storedKeyMatch === cleanedKey) {
            storedMachineId = parsed.machineId;
            hasFirstActivated = true;
          }
        }
      }
    } catch (err) {
      console.error('Error reading/decrypting machine activation:', err);
    }
  }

  // Always call Gumroad with increment_uses_count: false after the first activation so the count stays at 1 and is only used as a flag
  const shouldIncrement = !hasFirstActivated;

  // Gumroad API can be sensitive to content-types. We try URL-encoded first and fall back to JSON.
  try {
    const params = new URLSearchParams();
    params.append('license_key', licenseKey);
    params.append('increment_uses_count', shouldIncrement ? 'true' : 'false');
    if (usePermalink) {
      params.append('product_permalink', productId);
    } else {
      params.append('product_id', productId);
    }
    if (accessToken) {
      params.append('access_token', accessToken);
    }

    console.log(`Verifying license with Gumroad URL-encoded API. Product ID: ${productId}`);
    let response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });

    let data = {};
    try {
      data = await response.json();
    } catch (jsonErr) {
      console.error('Failed to parse Gumroad response as JSON, trying text:', jsonErr);
    }

    console.log('Gumroad direct response state:', response.status, data);

    if (!response.ok || !data.success) {
      // Fallback to JSON payload
      const requestBody = {
        license_key: licenseKey,
        increment_uses_count: shouldIncrement
      };
      if (usePermalink) {
        requestBody.product_permalink = productId;
      } else {
        requestBody.product_id = productId;
      }
      if (accessToken) {
        requestBody.access_token = accessToken;
      }

      console.log('Trying JSON fallback verification...');
      const fallbackResponse = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        console.log('Gumroad JSON response:', fallbackResponse.status, fallbackData);
        data = fallbackData; // retain latest error message if still failed
      }
    }

    // Process Gumroad result
    if (data.success) {
      if (data.purchase && data.purchase.refunded === true) {
        return { ok: false, error: 'This license has been refunded and is no longer valid.' };
      }

      const uses = (data.uses !== undefined) ? data.uses : 0;
      if (uses > 1 && storedMachineId !== currentMachineId) {
        return { 
          ok: false, 
          error: 'This license key is already activated on another device. Contact support to transfer.' 
        };
      }

      if (uses === 1 || storedMachineId === currentMachineId) {
        const { isLifetime, isTrial, type: purchaseType, expiresAt } = parseGumroadPurchaseType(data.purchase);

        // Handle Gumroad 5-day trial licenses
        if (isTrial) {
          if (expiresAt && Date.now() > expiresAt) {
            return {
              ok: false,
              type: 'trial_expired',
              error: 'This 5-day trial key has expired. Please purchase a lifetime or annual license at overdesk.store.'
            };
          }

          const daysLeft = Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
          writeConfig({
            licenseValid: true,
            licenseKey,
            licenseType: 'trial',
            licenseExpiresAt: expiresAt,
            trialStartedAt: expiresAt - (5 * 24 * 60 * 60 * 1000),
            trialUsed: true
          });

          return { ok: true, type: 'trial', isLifetime: false, trialActive: true, trialDaysLeft: daysLeft, expiresAt };
        }

        // Handle Annual subscription licenses
        if (!isLifetime && expiresAt && Date.now() > expiresAt) {
          return {
            ok: false,
            error: 'This annual license key has expired. Please renew your subscription or purchase a new key at overdesk.store.'
          };
        }

        // Handle Genuine Lifetime or Annual licenses
        const finalType = isLifetime ? 'lifetime' : 'annual';

        if (!hasFirstActivated) {
          try {
            const dataToEncrypt = JSON.stringify({
              machineId: currentMachineId,
              licenseKey: licenseKey,
              licenseType: finalType,
              licenseExpiresAt: expiresAt
            });
            const encryptedStr = encryptData(dataToEncrypt);
            fs.writeFileSync(licenseDevicePath, encryptedStr, 'utf8');
          } catch (writeErr) {
            console.error('Failed to store machine fingerprint:', writeErr);
          }
        }

        writeConfig({
          licenseValid: true,
          licenseKey,
          licenseType: finalType,
          licenseExpiresAt: isLifetime ? null : expiresAt
        });

        return { ok: true, type: finalType, isLifetime, expiresAt };
      }
    }

    const errorMessage = data && data.message ? data.message : `Gumroad verification failed (Status: ${response.status})`;
    return { ok: false, error: errorMessage };

  } catch (err) {
    console.error('Gumroad fetch error:', err);
    return { ok: false, error: err.message || 'Network error connecting to Gumroad.' };
  }
});

// Dynamic click-through/ignore-mouse-events handling for transparent shadow padding area
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(ignore, options);
  }
});

// Close Application (Hide to tray area)
ipcMain.on('close-app', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// Set Height dynamically (e.g. on minimizing)
ipcMain.on('set-height', (event, height) => {
  if (mainWindow) {
    const [w] = mainWindow.getSize();
    const config = readConfig();
    const scale = config.scale || 1.0;
    const newHeight = Math.round((height + 140) * scale);
    mainWindow.setSize(w, newHeight);
  }
});

// Track exact bounds in scaled layout
ipcMain.on('card-bounds', (event, bounds) => {
  if (mainWindow && bounds) {
    const config = readConfig();
    const activeScale = bounds.scale !== undefined ? bounds.scale : (config.scale || 1.0);
    
    // Resize Electron window to fit card with ample transparent margin for soft blurred shadow glow
    const targetW = Math.max(100, Math.round((bounds.w + 120) * activeScale));
    const targetH = Math.max(50, Math.round((bounds.h + 140) * activeScale));
    
    // Fetch current position and size
    const [currentX, currentY] = mainWindow.getPosition();
    const [currentW, currentH] = mainWindow.getSize();
    
    // Initialize or read position from cached values
    if (cachedX === null || cachedY === null) {
      cachedX = currentX;
      cachedY = currentY;
    }
    if (cachedScale === null) {
      cachedScale = activeScale;
    }
    
    let newX = currentX;
    let newY = currentY;
    
    const isScaleChanged = cachedScale !== null && Math.abs(activeScale - cachedScale) > 0.01;
    
    if (isScaling && scaleAnchorX !== null && scaleAnchorY !== null) {
      // Anchors the top-left of the window during active drag-and-resize scaling so it scales strictly from the bottom
      newX = scaleAnchorX;
      newY = scaleAnchorY;
      cachedScale = activeScale;
    } else {
      // Keeps the top-left of the window perfectly constant for all scale changes and height updates 
      // (minimizing/expanding, adding/removing checklist items, scale sliders/buttons, settings toggles)
      // so the app scales strictly from the bottom down without top/side position shift.
      newX = currentX;
      newY = currentY;
      cachedScale = activeScale;
    }
    
    // Update cache proactively before the asynchronous window shift settles
    cachedX = newX;
    cachedY = newY;
    
    isProgrammaticBoundsUpdate = true;
    if (programmaticTimeout) clearTimeout(programmaticTimeout);
    
    mainWindow.setBounds({
      x: newX,
      y: newY,
      width: targetW,
      height: targetH
    });
    
    programmaticTimeout = setTimeout(() => {
      isProgrammaticBoundsUpdate = false;
    }, 200);
    
    writeConfig({ x: newX, y: newY, scale: activeScale });
  }
});

ipcMain.on('scale-start', () => {
  isScaling = true;
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    scaleAnchorX = x;
    scaleAnchorY = y;
  }
});

ipcMain.on('scale-end', (event, scale) => {
  isScaling = false;
  scaleAnchorX = null;
  scaleAnchorY = null;
  writeConfig({ scale });
});

ipcMain.on('save-icon', (event, dataUrl) => {
  try {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    const customIconPath = path.join(app.getPath('userData'), 'icon.png');
    fs.writeFileSync(customIconPath, base64Data, 'base64');
    
    // Dynamically update main window icon
    if (mainWindow) {
      const nativeImg = nativeImage.createFromPath(customIconPath);
      mainWindow.setIcon(nativeImg);
    }
    
    // Dynamically update tray icon
    if (tray) {
      const customTrayPath = path.join(app.getPath('userData'), 'tray-icon.png');
      const packagedTrayPath = path.join(__dirname, 'tray-icon.png');
      const trayPath = fs.existsSync(customTrayPath) ? customTrayPath : (fs.existsSync(packagedTrayPath) ? packagedTrayPath : customIconPath);

      let trayImg;
      if (process.platform === 'win32') {
        trayImg = nativeImage.createFromPath(trayPath).resize({ width: 32, height: 32, quality: 'best' });
      } else if (process.platform === 'darwin') {
        trayImg = nativeImage.createFromPath(trayPath).resize({ width: 22, height: 22, quality: 'best' });
        trayImg.setTemplateImage(true);
      } else {
        trayImg = nativeImage.createFromPath(trayPath).resize({ width: 32, height: 32, quality: 'best' });
      }
      tray.setImage(trayImg);
    }
  } catch (err) {
    console.error('Error saving dynamic icon:', err);
  }
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

// Auto-Launch on PC Startup IPC Handlers
ipcMain.handle('get-auto-launch', () => {
  try {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  } catch (err) {
    console.error('Error getting auto-launch settings:', err);
    return false;
  }
});

ipcMain.handle('set-auto-launch', (event, openAtLogin) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: !!openAtLogin,
      openAsHidden: false,
      name: 'Overdesk Everyone',
    });
    writeConfig({ autoLaunch: !!openAtLogin });
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  } catch (err) {
    console.error('Error setting auto-launch settings:', err);
    return false;
  }
});
