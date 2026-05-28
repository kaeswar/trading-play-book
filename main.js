const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const { initializeDatabase, getDb } = require('./src/main/db/database');
const symbolRepo = require('./src/main/db/symbolRepo');
const tradingDayRepo = require('./src/main/db/tradingDayRepo');
const possibilityRepo = require('./src/main/db/possibilityRepo');
const outcomePlanRepo = require('./src/main/db/outcomePlanRepo');
const screenshotRepo = require('./src/main/db/screenshotRepo');
const verdictRepo = require('./src/main/db/verdictRepo');
const stockPlanRepo = require('./src/main/db/stockPlanRepo');
const verdictScreenshotRepo = require('./src/main/db/verdictScreenshotRepo');
const customPlanRepo = require('./src/main/db/customPlanRepo');
const customPlanScreenshotRepo = require('./src/main/db/customPlanScreenshotRepo');
const intradayNoteRepo = require('./src/main/db/intradayNoteRepo');
const intradayNoteScreenshotRepo = require('./src/main/db/intradayNoteScreenshotRepo');
const planningService = require('./src/main/services/PlanningService');

let mainWindow;
const imageViewerWindows = new Set();

function openImageViewer(fullPath, fileName) {
  const viewer = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    title: fileName || 'Image Viewer',
    backgroundColor: '#0f1117',
    parent: mainWindow,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const queryPath = encodeURIComponent(fullPath);
  const queryName = encodeURIComponent(fileName || 'Image');
  const viewerHtml = path.join(__dirname, 'src', 'main', 'imageViewer.html');

  viewer.loadFile(viewerHtml, { query: { path: queryPath, name: queryName } });

  imageViewerWindows.add(viewer);
  viewer.on('closed', () => imageViewerWindows.delete(viewer));

  return viewer;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Trading Play Book',
    icon: path.join(__dirname, 'assets/icon.ico'),
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

// Initialize app
app.whenReady().then(() => {
  initializeDatabase();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Get images directory
function getImagesDir() {
  const imagesDir = path.join(app.getPath('userData'), 'images');
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  return imagesDir;
}

// Register all IPC handlers
function registerIpcHandlers() {
  // --- Symbol handlers ---
  ipcMain.handle('symbol:getAll', () => symbolRepo.getAll());
  ipcMain.handle('symbol:getActive', () => symbolRepo.getActive());
  ipcMain.handle('symbol:create', (_, name) => symbolRepo.create(name));
  ipcMain.handle('symbol:setInactive', (_, id) => symbolRepo.setInactive(id));

  // --- Trading Day handlers ---
  ipcMain.handle('tradingDay:getById', (_, id) => tradingDayRepo.getById(id));
  ipcMain.handle('tradingDay:getByDateAndSymbol', (_, date, symbolId) =>
    tradingDayRepo.getByDateAndSymbol(date, symbolId)
  );
  ipcMain.handle('tradingDay:getAll', () => tradingDayRepo.getAll());
  ipcMain.handle('tradingDay:create', (_, data) => planningService.createTradingDay(data));
  ipcMain.handle('tradingDay:updateNotes', (_, id, notes) =>
    tradingDayRepo.updateNotes(id, notes)
  );

  ipcMain.handle('tradingDay:delete', (_, id) => tradingDayRepo.delete(id));
  ipcMain.handle('tradingDay:getAvailableDates', (_, symbolId) => tradingDayRepo.getAvailableDates(symbolId));

  // --- Possibility handlers ---
  ipcMain.handle('possibility:getByTradingDay', (_, tradingDayId) =>
    possibilityRepo.getByTradingDay(tradingDayId)
  );
  ipcMain.handle('possibility:create', (_, data) => possibilityRepo.create(data));
  ipcMain.handle('possibility:updateHasPlan', (_, id, hasPlan) =>
    possibilityRepo.updateHasPlan(id, hasPlan)
  );

  // --- Outcome Plan handlers ---
  ipcMain.handle('outcomePlan:getByPossibility', (_, possibilityId) =>
    outcomePlanRepo.getByPossibility(possibilityId)
  );
  ipcMain.handle('outcomePlan:create', (_, data) => outcomePlanRepo.create(data));
  ipcMain.handle('outcomePlan:update', (_, id, data) => outcomePlanRepo.update(id, data));
  ipcMain.handle('outcomePlan:delete', (_, id) => {
    // Clean up intraday note screenshot files before deleting
    const notes = intradayNoteRepo.getByOutcomePlan(id);
    for (const note of notes) {
      intradayNoteScreenshotRepo.deleteByIntradayNote(note.id);
    }
    return outcomePlanRepo.delete(id);
  });

  // --- Screenshot handlers ---
  ipcMain.handle('screenshot:getByOutcomePlan', (_, outcomePlanId) =>
    screenshotRepo.getByOutcomePlan(outcomePlanId)
  );
  ipcMain.handle('screenshot:create', (_, data) => screenshotRepo.create(data));
  ipcMain.handle('screenshot:delete', (_, id) => {
    const ss = screenshotRepo.getById(id);
    if (ss) {
      const fullPath = path.join(app.getPath('userData'), ss.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    return screenshotRepo.delete(id);
  });

  // --- Verdict handlers ---
  ipcMain.handle('verdict:getByTradingDay', (_, tradingDayId) =>
    verdictRepo.getByTradingDay(tradingDayId)
  );
  ipcMain.handle('verdict:create', (_, data) => verdictRepo.create(data));
  ipcMain.handle('verdict:update', (_, id, data) => verdictRepo.update(id, data));

  // --- Verdict Screenshot handlers ---
  ipcMain.handle('verdictScreenshot:getByVerdict', (_, verdictId) =>
    verdictScreenshotRepo.getByVerdict(verdictId)
  );
  ipcMain.handle('verdictScreenshot:create', (_, data) => verdictScreenshotRepo.create(data));
  ipcMain.handle('verdictScreenshot:delete', (_, id) => verdictScreenshotRepo.delete(id));

  // --- Image file handlers ---
  ipcMain.handle('image:import', async (_, sourcePath, symbolName, date, fileName) => {
    const imagesDir = getImagesDir();
    const symbolDir = path.join(imagesDir, symbolName, date);
    if (!fs.existsSync(symbolDir)) fs.mkdirSync(symbolDir, { recursive: true });

    const destPath = path.join(symbolDir, fileName);
    fs.copyFileSync(sourcePath, destPath);

    // Return relative path from userData
    const relativePath = path.relative(app.getPath('userData'), destPath);
    return relativePath;
  });

  ipcMain.handle('image:getFullPath', (_, relativePath) => {
    return path.join(app.getPath('userData'), relativePath);
  });

  ipcMain.handle('image:toDataUrl', (_, filePath) => {
    try {
      if (!fs.existsSync(filePath)) return null;
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' }[ext] || 'image/png';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
      return null;
    }
  });

  ipcMain.handle('image:saveBuffer', (_, uint8Array, symbolName, date, fileName) => {
    const imagesDir = getImagesDir();
    const dir = path.join(imagesDir, symbolName, date);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const destPath = path.join(dir, fileName);
    fs.writeFileSync(destPath, Buffer.from(uint8Array));
    return path.relative(app.getPath('userData'), destPath);
  });

  ipcMain.handle('image:openExternal', async (_, relativePath) => {
    const fullPath = path.join(app.getPath('userData'), relativePath);
    if (fs.existsSync(fullPath)) {
      await shell.openPath(fullPath);
    }
  });

  ipcMain.handle('image:openViewer', async (_, relativePath) => {
    const fullPath = path.join(app.getPath('userData'), relativePath);
    const fileName = path.basename(relativePath);
    if (fs.existsSync(fullPath)) {
      openImageViewer(fullPath, fileName);
    }
  });

  ipcMain.handle('image:openExternalByPath', async (_, fullPath) => {
    const cleanPath = fullPath.replace(/^file:[/\\]+/, '');
    if (fs.existsSync(cleanPath)) {
      await shell.openPath(cleanPath);
    }
  });

  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
      ],
    });
    return result.filePaths;
  });

  // --- Query handlers (Phase 3) ---
  ipcMain.handle('query:getFilteredDays', (_, filters) => {
    return tradingDayRepo.getFiltered(filters);
  });

  ipcMain.handle('query:getMetrics', (_, symbolId) => {
    return verdictRepo.getMetrics(symbolId);
  });

  // --- Stock Plan handlers ---
  ipcMain.handle('stockPlan:getAll', () => stockPlanRepo.getAll());
  ipcMain.handle('stockPlan:getById', (_, id) => stockPlanRepo.getById(id));
  ipcMain.handle('stockPlan:create', (_, data) => stockPlanRepo.create(data));
  ipcMain.handle('stockPlan:update', (_, id, data) => stockPlanRepo.update(id, data));
  ipcMain.handle('stockPlan:updateExecutionStatus', (_, id, status) =>
    stockPlanRepo.updateExecutionStatus(id, status)
  );
  ipcMain.handle('stockPlan:delete', (_, id) => stockPlanRepo.delete(id));
  ipcMain.handle('stockPlan:search', (_, filters) => stockPlanRepo.search(filters));
  ipcMain.handle('stockPlan:getDistinctStockNames', () => stockPlanRepo.getDistinctStockNames());

  // --- Custom Plan handlers ---
  ipcMain.handle('customPlan:getByTradingDay', (_, tradingDayId) =>
    customPlanRepo.getByTradingDay(tradingDayId)
  );
  ipcMain.handle('customPlan:getById', (_, id) => customPlanRepo.getById(id));
  ipcMain.handle('customPlan:create', (_, data) => customPlanRepo.create(data));
  ipcMain.handle('customPlan:update', (_, id, data) => customPlanRepo.update(id, data));
  ipcMain.handle('customPlan:updateVerdict', (_, id, data) =>
    customPlanRepo.updateVerdict(id, data)
  );
  ipcMain.handle('customPlan:delete', (_, id) => {
    // Clean up intraday note screenshot files + custom plan screenshot files before deleting
    const notes = intradayNoteRepo.getByCustomPlan(id);
    for (const note of notes) {
      intradayNoteScreenshotRepo.deleteByIntradayNote(note.id);
    }
    customPlanScreenshotRepo.deleteByCustomPlan(id);
    return customPlanRepo.delete(id);
  });

  // --- Custom Plan Screenshot handlers ---
  ipcMain.handle('customPlanScreenshot:getByCustomPlan', (_, customPlanId) =>
    customPlanScreenshotRepo.getByCustomPlan(customPlanId)
  );
  ipcMain.handle('customPlanScreenshot:create', (_, data) =>
    customPlanScreenshotRepo.create(data)
  );
  ipcMain.handle('customPlanScreenshot:delete', (_, id) =>
    customPlanScreenshotRepo.delete(id)
  );

  // --- Intraday Note handlers ---
  ipcMain.handle('intradayNote:getByOutcomePlan', (_, outcomePlanId) =>
    intradayNoteRepo.getByOutcomePlan(outcomePlanId)
  );
  ipcMain.handle('intradayNote:getByCustomPlan', (_, customPlanId) =>
    intradayNoteRepo.getByCustomPlan(customPlanId)
  );
  ipcMain.handle('intradayNote:getByTradingDay', (_, tradingDayId) =>
    intradayNoteRepo.getByTradingDay(tradingDayId)
  );
  ipcMain.handle('intradayNote:countByTradingDay', (_, tradingDayId) =>
    intradayNoteRepo.countByTradingDay(tradingDayId)
  );
  ipcMain.handle('intradayNote:create', (_, data) => intradayNoteRepo.create(data));
  ipcMain.handle('intradayNote:update', (_, id, data) => intradayNoteRepo.update(id, data));
  ipcMain.handle('intradayNote:updateAttachment', (_, id, data) => intradayNoteRepo.updateAttachment(id, data));
  ipcMain.handle('intradayNote:delete', (_, id) => {
    intradayNoteScreenshotRepo.deleteByIntradayNote(id);
    return intradayNoteRepo.delete(id);
  });

  // --- Intraday Note Screenshot handlers ---
  ipcMain.handle('intradayNoteScreenshot:getByIntradayNote', (_, intradayNoteId) =>
    intradayNoteScreenshotRepo.getByIntradayNote(intradayNoteId)
  );
  ipcMain.handle('intradayNoteScreenshot:create', (_, data) =>
    intradayNoteScreenshotRepo.create(data)
  );
  ipcMain.handle('intradayNoteScreenshot:delete', (_, id) =>
    intradayNoteScreenshotRepo.delete(id)
  );
}
