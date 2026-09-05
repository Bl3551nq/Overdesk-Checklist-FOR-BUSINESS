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
function writeConfig(data, immediate = false) {
  try {
    const current = readConfig();
    configCache = { ...current, ...data };
    
    if (immediate) {
      if (writeTimeout) clearTimeout(writeTimeout);
      try {
        fs.writeFileSync(configPath, JSON.stringify(configCache, null, 2), 'utf8');
      } catch (writeErr) {
        console.error('Error synchronously writing config:', writeErr);
      }
      return;
    }

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

// ── Hardware Fingerprint & Persistent Encrypted Device Vault ──
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

function getDeviceVaultPaths() {
  const paths = [
    path.join(app.getPath('userData'), 'license-device.enc')
  ];

  try {
    const homeDir = os.homedir();
    if (homeDir) {
      paths.push(path.join(homeDir, '.overdesk_device_vault.enc'));
    }
  } catch (e) {}

  try {
    if (process.env.LOCALAPPDATA) {
      const localAppDir = path.join(process.env.LOCALAPPDATA, 'Overdesk');
      paths.push(path.join(localAppDir, 'device-vault.enc'));
    }
  } catch (e) {}

  return paths;
}

function getDeviceTrialRecord() {
  const config = readConfig();
  const currentMachineId = getMachineId();
  let trialUsed = config.trialUsed === true || config.trialExpired === true;
  let trialStartedAt = config.trialStartedAt || null;
  let trialExpired = config.trialExpired === true;
  let storedKey = config.licenseKey || null;
  let machineMatches = false;

  const vaultPaths = getDeviceVaultPaths();
  for (const vPath of vaultPaths) {
    if (fs.existsSync(vPath)) {
      try {
        const encryptedData = fs.readFileSync(vPath, 'utf8').trim();
        const decrypted = decryptData(encryptedData);
        if (decrypted) {
          const parsed = JSON.parse(decrypted);
          if (parsed.trialUsed) trialUsed = true;
          if (parsed.trialExpired) trialExpired = true;
          if (parsed.trialStartedAt) {
            trialStartedAt = trialStartedAt ? Math.min(trialStartedAt, parsed.trialStartedAt) : parsed.trialStartedAt;
          }
          if (parsed.licenseKey && !storedKey) {
            storedKey = parsed.licenseKey;
          }
          if (parsed.machineId === currentMachineId) {
            machineMatches = true;
          }
        }
      } catch (err) {}
    }
  }

  // Check if 5-day trial period (5 * 24 * 60 * 60 * 1000 = 432,000,000 ms) has elapsed
  if (trialStartedAt && (Date.now() > trialStartedAt + (5 * 24 * 60 * 60 * 1000))) {
    trialUsed = true;
    trialExpired = true;
  }

  // If trial is flagged as used or expired in any storage, lock and synchronize all vaults immediately
  if (trialUsed || trialExpired) {
    persistDeviceTrialRecord({
      machineId: currentMachineId,
      trialStartedAt: trialStartedAt || (Date.now() - (6 * 24 * 60 * 60 * 1000)),
      trialUsed: true,
      trialExpired: true
    });
  }

  return {
    trialUsed,
    trialExpired,
    trialStartedAt,
    storedKey,
    machineMatches,
    isDeviceTrialExpiredOrUsed: trialUsed || trialExpired
  };
}

function persistDeviceTrialRecord(record = {}) {
  try {
    const currentMachineId = getMachineId();
    const dataToSave = {
      machineId: currentMachineId,
      trialUsed: true,
      trialExpired: record.trialExpired !== undefined ? record.trialExpired : true,
      trialStartedAt: record.trialStartedAt || Date.now(),
      updatedAt: Date.now(),
      ...record
    };

    const encryptedStr = encryptData(JSON.stringify(dataToSave));
    const vaultPaths = getDeviceVaultPaths();
    for (const vPath of vaultPaths) {
      try {
        const dir = path.dirname(vPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(vPath, encryptedStr, 'utf8');
      } catch (e) {}
    }

    // Synchronously write to app-config.json
    writeConfig({
      trialUsed: true,
      trialExpired: dataToSave.trialExpired,
      trialStartedAt: dataToSave.trialStartedAt
    }, true);
  } catch (err) {
    console.error('Failed to persist device trial record:', err);
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

// Configure autoUpdater - silent automatic updates without intrusive popups
autoUpdater.logger = console;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;
autoUpdater.allowDowngrade = false;

app.on('before-quit', () => {
  isQuitting = true;
});

autoUpdater.on('update-available', (info) => {
  console.log('[AutoUpdater] New update available:', info?.version);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-available', info?.version);
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('[AutoUpdater] App is up to date.');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-not-available');
  }
});

autoUpdater.on('error', (err) => {
  console.error('[AutoUpdater] Update error:', err ? err.message : err);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-error', err ? err.message : 'Update check failed');
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[AutoUpdater] Update downloaded completely:', info?.version);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-downloaded', info?.version);
  }
  // Install silently and automatically restart after download completes
  setTimeout(() => {
    try {
      console.log('[AutoUpdater] Triggering silent background quitAndInstall...');
      isQuitting = true;
      autoUpdater.quitAndInstall(true, true);
    } catch (e) {
      console.error('[AutoUpdater] Error quitting and installing update silently:', e);
      try {
        isQuitting = true;
        autoUpdater.quitAndInstall(false, true);
      } catch (e2) {
        console.error('[AutoUpdater] Secondary quitAndInstall attempt error:', e2);
      }
    }
  }, 1500);
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
      if (app.isPackaged) {
        autoUpdater.checkForUpdates().catch((err) => {
          console.log('[AutoUpdater] Silent launch check:', err?.message || err);
        });
      }
    } catch (e) {}
  }, 4000);

  // Periodically check for updates automatically every 2 hours
  setInterval(() => {
    try {
      if (app.isPackaged) {
        autoUpdater.checkForUpdates().catch((err) => {
          console.log('[AutoUpdater] Silent periodic check:', err?.message || err);
        });
      }
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
  if (!purchase) return { isLifetime: false, isTrial: true, type: 'trial', expiresAt: Date.now() };

  const optName = String(purchase.option_name || '').toLowerCase();
  const variantsStr = JSON.stringify(purchase.variants || {}).toLowerCase();
  const selectedText = `${optName} ${variantsStr}`;

  // Check if this purchase was free / $0
  const isFreePrice = purchase.price === undefined || purchase.price === 0 || purchase.price === '0' || purchase.paid === false;

  // 1. Strict Lifetime identification (priority: paid or lifetime option)
  const isLifetime = selectedText.includes('guyuge2gou1zwkk') ||
                     selectedText.includes('lifetime') ||
                     selectedText.includes('life-time') ||
                     selectedText.includes('permanent');

  if (isLifetime && !isFreePrice) {
    return { isLifetime: true, isTrial: false, type: 'lifetime', expiresAt: null };
  }

  // 2. Annual / Subscription option
  const isAnnual = selectedText.includes('qvven2gsxn01xog') ||
                   selectedText.includes('annual') ||
                   selectedText.includes('subscription') ||
                   selectedText.includes('yearly') ||
                   purchase.is_recurring_billing === true;

  if (isAnnual && !isFreePrice) {
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

  // 3. ANY free / $0 purchase, or option containing trial keywords, is ALWAYS treated as a 5-day trial
  const isTrial = isFreePrice ||
                  selectedText.includes('cw7daxozipa2o1szuwsqrw') ||
                  selectedText.includes('trial') ||
                  selectedText.includes('free trial') ||
                  selectedText.includes('5-day');

  if (isTrial) {
    const createdAtMs = purchase.created_at ? new Date(purchase.created_at).getTime() : Date.now();
    const trialExpiresAt = createdAtMs + (5 * 24 * 60 * 60 * 1000);
    return { isLifetime: false, isTrial: true, type: 'trial', expiresAt: trialExpiresAt };
  }

  // 4. Fallback for paid purchases (> 0)
  if (purchase.price && Number(purchase.price) > 0) {
    if (purchase.is_recurring_billing) {
      return { isLifetime: false, isTrial: false, type: 'annual', expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) };
    }
    return { isLifetime: true, isTrial: false, type: 'lifetime', expiresAt: null };
  }

  return { isLifetime: false, isTrial: true, type: 'trial', expiresAt: Date.now() };
}

// Check if license or trial is active
ipcMain.handle('check-license', () => {
  const config = readConfig();
  const trialRecord = getDeviceTrialRecord();

  let trialStartedAt = config.trialStartedAt || trialRecord.trialStartedAt || null;
  let trialUsed = trialRecord.trialUsed || config.trialUsed || false;
  let storedLicenseKey = config.licenseKey || trialRecord.storedKey || null;

  // 1. Check paid or registered key status
  if (config.licenseValid && (config.licenseKey || storedLicenseKey)) {
    // If the registered key was a trial license
    if (config.licenseType === 'trial') {
      const trialExpiresAt = config.licenseExpiresAt || (trialStartedAt ? trialStartedAt + (5 * 24 * 60 * 60 * 1000) : 0);
      if (trialExpiresAt && Date.now() <= trialExpiresAt && !trialRecord.trialExpired) {
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
        // Trial expired - permanently record in all vaults and config
        persistDeviceTrialRecord({ trialExpired: true, trialUsed: true, trialStartedAt });
        writeConfig({ licenseValid: false, trialUsed: true, trialExpired: true }, true);
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
        return { ok: true, type: 'annual', isLifetime: false, expiresAt: config.licenseExpiresAt, daysLeft, key: config.licenseKey, trialUsed: true };
      } else {
        // Annual license key expired
        writeConfig({ licenseValid: false }, true);
        return {
          ok: false,
          type: 'expired',
          trialUsed: true,
          expiredMessage: 'Your annual license key has expired. Please enter a valid license or purchase a new one at overdesk.store.'
        };
      }
    }

    // Genuine lifetime licenses
    if (config.licenseType === 'lifetime' || !config.licenseType) {
      return { ok: true, type: 'lifetime', isLifetime: true, key: config.licenseKey || storedLicenseKey, trialUsed: true };
    }
  }

  // 2. Check 5-day in-app trial status
  if (trialStartedAt) {
    const trialExpiresAt = trialStartedAt + (5 * 24 * 60 * 60 * 1000); // 5 days ms
    if (Date.now() <= trialExpiresAt && !trialRecord.trialExpired) {
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
      // Trial expired - permanently record in all vaults and config
      persistDeviceTrialRecord({ trialExpired: true, trialUsed: true, trialStartedAt });
      writeConfig({ licenseValid: false, trialUsed: true, trialExpired: true }, true);
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
    trialUsed: trialRecord.isDeviceTrialExpiredOrUsed
  };
});

// Start 5-day Trial IPC
ipcMain.handle('start-trial', () => {
  const trialRecord = getDeviceTrialRecord();

  if (trialRecord.isDeviceTrialExpiredOrUsed) {
    persistDeviceTrialRecord({ trialUsed: true, trialExpired: true });
    return {
      ok: false,
      trialUsed: true,
      error: 'Your free trial has already been used on this device. Please purchase a license to continue.'
    };
  }

  const now = Date.now();
  const expiresAt = now + (5 * 24 * 60 * 60 * 1000);

  persistDeviceTrialRecord({
    trialStartedAt: now,
    trialUsed: true,
    trialExpired: false
  });

  writeConfig({
    licenseValid: true,
    licenseType: 'trial',
    licenseExpiresAt: expiresAt,
    trialStartedAt: now,
    trialUsed: true,
    trialExpired: false
  }, true);

  return {
    ok: true,
    trialStartedAt: now,
    trialExpiresAt: expiresAt,
    daysLeft: 5
  };
});

// Gumroad License verify
ipcMain.handle('validate-license', async (event, rawKey) => {
  const licenseKey = rawKey.trim();
  const normalizedKey = licenseKey.toUpperCase();
  const cleanedKey = normalizedKey.replace(/[^A-Z0-9]/g, '');

  const currentMachineId = getMachineId();
  const trialRecord = getDeviceTrialRecord();
  const isDeviceTrialExpiredOrUsed = trialRecord.isDeviceTrialExpiredOrUsed;

  let hasFirstActivated = false;
  let storedMachineId = '';

  const vaultPaths = getDeviceVaultPaths();
  for (const vPath of vaultPaths) {
    if (fs.existsSync(vPath)) {
      try {
        const encryptedData = fs.readFileSync(vPath, 'utf8').trim();
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
      } catch (err) {}
    }
  }

  // Support offline/testing authorization override keys
  if (
    normalizedKey === 'TEST-LICENSE-KEY' ||
    normalizedKey === 'TEST-LIFETIME-KEY' ||
    normalizedKey === 'OVERDESK-LIFETIME-TEST' ||
    normalizedKey === 'OVERDESK-TEST-KEY-2026' ||
    normalizedKey === 'TEST-1234-5678-90AB-CDEF-1234-5678'
  ) {
    persistDeviceTrialRecord({ trialUsed: true });
    writeConfig({ licenseValid: true, licenseKey, licenseType: 'lifetime', licenseExpiresAt: null, trialActive: false, trialUsed: true }, true);
    return { ok: true, test: true, type: 'lifetime', isLifetime: true, expiresAt: null };
  }

  if (normalizedKey === 'TEST-ANNUAL-KEY') {
    const expiresAt = Date.now() + (365 * 24 * 60 * 60 * 1000);
    persistDeviceTrialRecord({ trialUsed: true });
    writeConfig({ licenseValid: true, licenseKey, licenseType: 'annual', licenseExpiresAt: expiresAt, trialActive: false, trialUsed: true }, true);
    return { ok: true, test: true, type: 'annual', isLifetime: false, expiresAt };
  }

  // Any trial test key
  if (normalizedKey === 'TEST-TRIAL-KEY' || normalizedKey === 'TEST-TRIAL-EXPIRED' || normalizedKey.includes('TRIAL')) {
    const isExpired = normalizedKey === 'TEST-TRIAL-EXPIRED' || isDeviceTrialExpiredOrUsed;
    if (isExpired) {
      persistDeviceTrialRecord({ trialExpired: true, trialUsed: true });
      return {
        ok: false,
        type: 'trial_expired',
        error: 'Your 5-day free trial has already expired on this device. Please purchase a lifetime or annual license at overdesk.store.'
      };
    }
    const expiresAt = Date.now() + (5 * 24 * 60 * 60 * 1000);
    persistDeviceTrialRecord({ trialStartedAt: Date.now(), trialUsed: true, trialExpired: false, licenseKey });
    writeConfig({ licenseValid: true, licenseKey, licenseType: 'trial', licenseExpiresAt: expiresAt, trialStartedAt: Date.now(), trialUsed: true }, true);
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

      if (uses === 1 || storedMachineId === currentMachineId || uses === 0) {
        const { isLifetime, isTrial, type: purchaseType, expiresAt } = parseGumroadPurchaseType(data.purchase);

        // Handle Gumroad 5-day trial licenses
        if (isTrial) {
          // CRITICAL: Prevent trial reuse on any machine that already used or expired a trial
          if (isDeviceTrialExpiredOrUsed) {
            persistDeviceTrialRecord({ trialExpired: true, trialUsed: true });
            return {
              ok: false,
              type: 'trial_expired',
              error: 'Your 5-day free trial has already expired on this device. Please purchase a lifetime or annual license at overdesk.store.'
            };
          }

          if (expiresAt && Date.now() > expiresAt) {
            persistDeviceTrialRecord({ trialExpired: true, trialUsed: true });
            return {
              ok: false,
              type: 'trial_expired',
              error: 'This 5-day trial key has expired. Please purchase a lifetime or annual license at overdesk.store.'
            };
          }

          const daysLeft = Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));

          // Save trial activation persistently across all device vaults and config immediately
          persistDeviceTrialRecord({
            machineId: currentMachineId,
            trialStartedAt: expiresAt - (5 * 24 * 60 * 60 * 1000),
            trialUsed: true,
            trialExpired: false,
            licenseKey
          });

          writeConfig({
            licenseValid: true,
            licenseKey,
            licenseType: 'trial',
            licenseExpiresAt: expiresAt,
            trialStartedAt: expiresAt - (5 * 24 * 60 * 60 * 1000),
            trialUsed: true
          }, true);

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

        persistDeviceTrialRecord({
          machineId: currentMachineId,
          licenseKey: licenseKey,
          licenseType: finalType,
          licenseExpiresAt: isLifetime ? null : expiresAt,
          trialUsed: true
        });

        writeConfig({
          licenseValid: true,
          licenseKey,
          licenseType: finalType,
          licenseExpiresAt: isLifetime ? null : expiresAt,
          trialActive: false,
          trialUsed: true
        }, true);

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
  isQuitting = true;
  try {
    autoUpdater.quitAndInstall(true, true);
  } catch (e) {
    autoUpdater.quitAndInstall(false, true);
  }
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
