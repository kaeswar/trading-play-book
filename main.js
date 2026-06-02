const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const { initializeDatabase, getDb } = require('./src/main/db/database');
const symbolRepo = require('./src/main/db/symbolRepo');
const tradingDayRepo = require('./src/main/db/tradingDayRepo');
const swingPlanRepo = require('./src/main/db/swingPlanRepo');
const swingPlanScreenshotRepo = require('./src/main/db/swingPlanScreenshotRepo');
const intradayNoteRepo = require('./src/main/db/intradayNoteRepo');
const intradayNoteScreenshotRepo = require('./src/main/db/intradayNoteScreenshotRepo');
const planGroupRepo = require('./src/main/db/planGroupRepo');
const planTemplateRepo = require('./src/main/db/planTemplateRepo');
const dayPlanRepo = require('./src/main/db/dayPlanRepo');
const dayPlanScreenshotRepo = require('./src/main/db/dayPlanScreenshotRepo');
const planningService = require('./src/main/services/PlanningService');
const exportService = require('./src/main/services/ExportService');
const backupService = require('./src/main/services/BackupService');

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

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'User Guide',
          accelerator: 'F1',
          click: () => mainWindow?.webContents.send('menu:open-guide'),
        },
        { type: 'separator' },
        {
          label: 'About Trading Play Book',
          click: () => mainWindow?.webContents.send('menu:open-about'),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Initialize app
app.whenReady().then(() => {
  initializeDatabase();
  registerIpcHandlers();
  buildMenu();
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

  // Atomic: create trading_day + one or more day_plans in a single transaction.
  // Used by the "Pick Plans for This Day" empty-state flow so a day never exists without plans.
  ipcMain.handle('tradingDay:createWithPlans', (_, { tradeDate, symbolId, notes, templateIds }) => {
    try {
      const db = getDb();
      const result = db.transaction(() => {
        let day = tradingDayRepo.getByDateAndSymbol(tradeDate, symbolId);
        if (!day) {
          day = tradingDayRepo.create({ tradeDate, symbolId, notes });
        }
        let order = dayPlanRepo.getByTradingDay(day.id).length;
        const plans = [];
        for (const tplId of (templateIds || [])) {
          plans.push(dayPlanRepo.createFromTemplate({
            tradingDayId: day.id, templateId: tplId, sortOrder: order++,
          }));
        }
        return { day, plans };
      })();
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tradingDay:updateNotes', (_, id, notes) =>
    tradingDayRepo.updateNotes(id, notes)
  );

  ipcMain.handle('tradingDay:updateDate', (_, id, newDate) => tradingDayRepo.updateDate(id, newDate));
  ipcMain.handle('tradingDay:delete', (_, id) => tradingDayRepo.delete(id));
  ipcMain.handle('tradingDay:getAvailableDates', (_, symbolId) => tradingDayRepo.getAvailableDates(symbolId));

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
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
      ],
    });
    return result.filePaths;
  });

  // --- Query handlers (Gallery) ---
  ipcMain.handle('query:getFilteredDays', (_, filters) => {
    return tradingDayRepo.getFiltered(filters);
  });

  ipcMain.handle('query:getMetrics', (_, symbolId) => {
    const db = getDb();
    const where = symbolId ? 'WHERE td.symbol_id = ?' : '';
    const args  = symbolId ? [symbolId] : [];
    const row = db.prepare(`
      SELECT
        COUNT(DISTINCT td.id) AS totalDays,
        COUNT(dp.id)          AS totalPlans,
        SUM(CASE WHEN dp.execution_status = 'Successful'   THEN 1 ELSE 0 END) AS successfulPlans,
        SUM(CASE WHEN dp.execution_status = 'Failed'       THEN 1 ELSE 0 END) AS failedPlans,
        SUM(CASE WHEN dp.execution_status = 'Cancelled'    THEN 1 ELSE 0 END) AS cancelledPlans,
        SUM(CASE WHEN dp.execution_status = 'Cost-to-Cost' THEN 1 ELSE 0 END) AS costToCostPlans,
        SUM(CASE WHEN dp.execution_status = 'UnPlanned'    THEN 1 ELSE 0 END) AS unplannedPlans,
        SUM(CASE WHEN dp.execution_status = 'Waiting' OR dp.execution_status IS NULL THEN 1 ELSE 0 END) AS waitingPlans
      FROM trading_day td
      LEFT JOIN day_plan dp ON dp.trading_day_id = td.id
      ${where}
    `).get(...args);
    const planned = db.prepare(`
      SELECT COUNT(DISTINCT td.id) AS preparedDays
      FROM trading_day td
      JOIN day_plan dp ON dp.trading_day_id = td.id
      ${where}
    `).get(...args);
    return {
      totalDays:        row.totalDays || 0,
      preparedDays:     planned.preparedDays || 0,
      totalPlans:       row.totalPlans || 0,
      successfulPlans:  row.successfulPlans || 0,
      failedPlans:      row.failedPlans || 0,
      cancelledPlans:   row.cancelledPlans || 0,
      costToCostPlans:  row.costToCostPlans || 0,
      unplannedPlans:   row.unplannedPlans || 0,
      waitingPlans:     row.waitingPlans || 0,
    };
  });

  // --- Stock Plan handlers ---
  // --- Swing Plan handlers ---
  ipcMain.handle('swingPlan:search',  (_, filters) => swingPlanRepo.search(filters || {}));
  ipcMain.handle('swingPlan:get',     (_, id) => swingPlanRepo.getById(id));
  ipcMain.handle('swingPlan:createFromTemplate', (_, data) => {
    try { return { success: true, swingPlan: swingPlanRepo.createFromTemplate(data) }; }
    catch (err) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('swingPlan:updateNumbers', (_, id, data) => {
    try { return { success: true, swingPlan: swingPlanRepo.updateNumbers(id, data) }; }
    catch (err) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('swingPlan:updateExecution', (_, id, data) => {
    try { return { success: true, swingPlan: swingPlanRepo.updateExecution(id, data) }; }
    catch (err) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('swingPlan:delete', (_, id) => {
    try {
      swingPlanScreenshotRepo.deleteBySwingPlan(id);  // unlink files before FK cascade
      swingPlanRepo.delete(id);
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('swingPlan:getDistinctSymbols', () => swingPlanRepo.getDistinctSymbols());

  // --- Swing Plan Screenshot handlers ---
  ipcMain.handle('swingPlanScreenshot:getBySwingPlan', (_, swingPlanId, kind) =>
    swingPlanScreenshotRepo.getBySwingPlan(swingPlanId, kind)
  );
  ipcMain.handle('swingPlanScreenshot:create', (_, data) => swingPlanScreenshotRepo.create(data));
  ipcMain.handle('swingPlanScreenshot:delete', (_, id) => swingPlanScreenshotRepo.delete(id));

  // --- Intraday Note handlers (per day_plan) ---
  ipcMain.handle('intradayNote:getByDayPlan', (_, dayPlanId) =>
    intradayNoteRepo.getByDayPlan(dayPlanId)
  );
  ipcMain.handle('intradayNote:getByTradingDay', (_, tradingDayId) =>
    intradayNoteRepo.getByTradingDay(tradingDayId)
  );
  ipcMain.handle('intradayNote:countByTradingDay', (_, tradingDayId) =>
    intradayNoteRepo.countByTradingDay(tradingDayId)
  );
  ipcMain.handle('intradayNote:create', (_, data) => intradayNoteRepo.create(data));
  ipcMain.handle('intradayNote:update', (_, id, data) => intradayNoteRepo.update(id, data));
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

  // --- Export handlers ---
  ipcMain.handle('export:toCSV', async (_, params) => {
    try {
      const exportData = exportService.buildExportData({ ...params, forPdf: false });
      if (exportData.summary.totalDays === 0) {
        return { success: false, error: 'No data found for the selected scope.' };
      }
      const defaultName = `TPB_${(params.symbolNames || []).join('-')}_${Date.now()}.csv`;
      const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save CSV Export',
        defaultPath: defaultName,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });
      if (canceled || !filePath) return { success: false, canceled: true };
      exportService.exportToCSV(exportData, filePath);
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('export:toPDF', async (_, params) => {
    try {
      const exportData = exportService.buildExportData({ ...params, forPdf: true });
      if (exportData.summary.totalDays === 0) {
        return { success: false, error: 'No data found for the selected scope.' };
      }
      const defaultName = `TPB_${(params.symbolNames || []).join('-')}_${Date.now()}.pdf`;
      const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save PDF Export',
        defaultPath: defaultName,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });
      if (canceled || !filePath) return { success: false, canceled: true };
      await exportService.exportToPDF(exportData, filePath);
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('export:swingToCSV', async (_, params) => {
    try {
      const swingData = exportService.buildSwingExportData({ ...params, forPdf: false });
      if (swingData.summary.total === 0) {
        return { success: false, error: 'No swing plans found for the selected scope.' };
      }
      const defaultName = `TPB_Swing_${Date.now()}.csv`;
      const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Swing Plans CSV',
        defaultPath: defaultName,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });
      if (canceled || !filePath) return { success: false, canceled: true };
      exportService.exportSwingToCSV(swingData, filePath);
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('export:swingToPDF', async (_, params) => {
    try {
      const swingData = exportService.buildSwingExportData({ ...params, forPdf: true });
      if (swingData.summary.total === 0) {
        return { success: false, error: 'No swing plans found for the selected scope.' };
      }
      const defaultName = `TPB_Swing_${Date.now()}.pdf`;
      const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Swing Plans PDF',
        defaultPath: defaultName,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });
      if (canceled || !filePath) return { success: false, canceled: true };
      await exportService.exportSwingToPDF(swingData, filePath);
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('export:planWiseToCSV', async (_, { templateId, symbolIds }) => {
    try {
      const data = exportService.buildPlanWiseExportData({ templateId, symbolIds });
      if (data.plans.length === 0) return { success: false, error: 'No plans found for the selected template and symbols.' };
      const now = new Date();
      const dd   = String(now.getDate()).padStart(2, '0');
      const mmm  = now.toLocaleString('en-US', { month: 'short' });
      const yyyy = now.getFullYear();
      const hh   = String(now.getHours()).padStart(2, '0');
      const min  = String(now.getMinutes()).padStart(2, '0');
      const ss   = String(now.getSeconds()).padStart(2, '0');
      const safePlanName = data.planName.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
      const defaultName  = `Export_${dd}_${mmm}_${yyyy}_${safePlanName}_TradingPlayBook_${hh}_${min}_${ss}.csv`;
      const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Plan Wise CSV',
        defaultPath: defaultName,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });
      if (canceled || !filePath) return { success: false, canceled: true };
      exportService.exportPlanWiseToCSV(data, filePath);
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('swingPlan:getDistinctSymbolsByTemplate', (_, templateId) => {
    try { return swingPlanRepo.getDistinctSymbolsByTemplate(templateId); }
    catch { return []; }
  });

  ipcMain.handle('swingPlan:getDistinctTemplates', () => {
    try { return swingPlanRepo.getDistinctTemplates(); }
    catch { return []; }
  });

  // --- Backup / Restore handlers ---
  ipcMain.handle('backup:export', async () => {
    try {
      const db = getDb();
      const userData = app.getPath('userData');
      const backupData = backupService.exportBackup(db, userData);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const defaultName = `TPB_Backup_${stamp}.tpbj`;
      const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Backup',
        defaultPath: defaultName,
        filters: [{ name: 'Trading PlayBook Backup', extensions: ['tpbj'] }],
      });
      if (canceled || !filePath) return { success: false, canceled: true };
      fs.writeFileSync(filePath, JSON.stringify(backupData), 'utf8');
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('backup:import', async () => {
    try {
      const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Backup File',
        filters: [{ name: 'Trading PlayBook Backup', extensions: ['tpbj'] }],
        properties: ['openFile'],
      });
      if (canceled || !filePaths.length) return { success: false, canceled: true };
      const db = getDb();
      const userData = app.getPath('userData');
      const stats = backupService.importBackup(db, userData, filePaths[0]);
      return { success: true, stats };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // --- Report handlers ---
  ipcMain.handle('report:intraday', (_, symbolId) => {
    const db = getDb();
    const where = symbolId ? 'WHERE td.symbol_id = ?' : '';
    const args  = symbolId ? [symbolId] : [];

    const monthly = db.prepare(`
      SELECT
        strftime('%Y-%m', td.trade_date) AS month,
        COUNT(DISTINCT td.id)            AS totalDays,
        COUNT(DISTINCT CASE WHEN dp.id IS NOT NULL THEN td.id END) AS plannedDays,
        COUNT(dp.id)                     AS totalPlans,
        SUM(CASE WHEN dp.execution_status = 'Successful' THEN 1 ELSE 0 END) AS successfulPlans
      FROM trading_day td
      LEFT JOIN day_plan dp ON dp.trading_day_id = td.id
      ${where}
      GROUP BY month
      ORDER BY month
    `).all(...args);

    const breakdown = db.prepare(`
      SELECT
        COUNT(DISTINCT td.id) AS totalDays,
        COUNT(DISTINCT CASE WHEN dp.id IS NOT NULL THEN td.id END) AS plannedDays,
        COUNT(dp.id)          AS totalPlans,
        SUM(CASE WHEN dp.execution_status = 'Successful'   THEN 1 ELSE 0 END) AS successful,
        SUM(CASE WHEN dp.execution_status = 'Failed'       THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN dp.execution_status = 'Cancelled'    THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN dp.execution_status = 'Cost-to-Cost' THEN 1 ELSE 0 END) AS costToCost,
        SUM(CASE WHEN dp.execution_status = 'UnPlanned'    THEN 1 ELSE 0 END) AS unplanned,
        SUM(CASE WHEN dp.id IS NOT NULL AND (dp.execution_status IS NULL OR dp.execution_status = 'Waiting') THEN 1 ELSE 0 END) AS waiting
      FROM trading_day td
      LEFT JOIN day_plan dp ON dp.trading_day_id = td.id
      ${where}
    `).get(...args);

    return { monthly, breakdown };
  });

  ipcMain.handle('report:swing', () => {
    const db = getDb();

    const statusBreakdown = db.prepare(`
      SELECT execution_status AS status, COUNT(*) AS count
      FROM swing_plan
      GROUP BY execution_status
    `).all();

    const byTimeframe = db.prepare(`
      SELECT
        timeframe,
        SUM(CASE WHEN execution_status = 'Successful'   THEN 1 ELSE 0 END) AS successful,
        SUM(CASE WHEN execution_status = 'Failed'       THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN execution_status = 'Cancelled'    THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN execution_status = 'Cost-to-Cost' THEN 1 ELSE 0 END) AS costToCost,
        SUM(CASE WHEN execution_status = 'UnPlanned'    THEN 1 ELSE 0 END) AS unplanned,
        SUM(CASE WHEN execution_status = 'Waiting'      THEN 1 ELSE 0 END) AS waiting,
        COUNT(*) AS total
      FROM swing_plan
      GROUP BY timeframe
      ORDER BY CASE timeframe
        WHEN 'Monthly' THEN 1 WHEN 'Weekly' THEN 2 WHEN 'Daily' THEN 3
        WHEN '4Hrs' THEN 4 WHEN '1Hrs' THEN 5 ELSE 6 END
    `).all();

    const totals = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN execution_status = 'Successful'   THEN 1 ELSE 0 END) AS successful,
        SUM(CASE WHEN execution_status = 'Failed'       THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN execution_status = 'Cost-to-Cost' THEN 1 ELSE 0 END) AS costToCost,
        SUM(CASE WHEN execution_status = 'UnPlanned'    THEN 1 ELSE 0 END) AS unplanned
      FROM swing_plan
    `).get();

    return { statusBreakdown, byTimeframe, totals };
  });

  // --- Plan Group handlers ---
  ipcMain.handle('planGroup:list', () => planGroupRepo.list());
  ipcMain.handle('planGroup:create', (_, data) => {
    try { return { success: true, group: planGroupRepo.create(data) }; }
    catch (err) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('planGroup:update', (_, id, data) => {
    try { return { success: true, group: planGroupRepo.update(id, data) }; }
    catch (err) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('planGroup:delete', (_, id) => {
    try { planGroupRepo.delete(id); return { success: true }; }
    catch (err) { return { success: false, error: err.message }; }
  });

  // --- Plan Template handlers ---
  ipcMain.handle('planTemplate:list', (_, filters) => planTemplateRepo.list(filters || {}));
  ipcMain.handle('planTemplate:get', (_, id) => planTemplateRepo.getById(id));
  ipcMain.handle('planTemplate:create', (_, data) => {
    try { return { success: true, template: planTemplateRepo.create(data) }; }
    catch (err) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('planTemplate:update', (_, id, data) => {
    try { return { success: true, template: planTemplateRepo.update(id, data) }; }
    catch (err) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('planTemplate:archive', (_, id, archived) => {
    try { return { success: true, template: planTemplateRepo.archive(id, archived) }; }
    catch (err) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('planTemplate:delete', (_, id) => {
    try { planTemplateRepo.delete(id); return { success: true }; }
    catch (err) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('planTemplate:clone', (_, id, overrideName) => {
    try { return { success: true, template: planTemplateRepo.clone(id, overrideName) }; }
    catch (err) { return { success: false, error: err.message }; }
  });

  // --- Day Plan handlers ---
  ipcMain.handle('dayPlan:getByTradingDay', (_, tradingDayId) => dayPlanRepo.getByTradingDay(tradingDayId));
  ipcMain.handle('dayPlan:get', (_, id) => dayPlanRepo.getById(id));
  ipcMain.handle('dayPlan:createFromTemplate', (_, data) => {
    try { return { success: true, dayPlan: dayPlanRepo.createFromTemplate(data) }; }
    catch (err) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('dayPlan:updateNumbers', (_, id, data) => {
    try { return { success: true, dayPlan: dayPlanRepo.updateNumbers(id, data) }; }
    catch (err) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('dayPlan:updateExecution', (_, id, data) => {
    try { return { success: true, dayPlan: dayPlanRepo.updateExecution(id, data) }; }
    catch (err) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('dayPlan:updateSortOrder', (_, id, sortOrder) => {
    try { return { success: true, dayPlan: dayPlanRepo.updateSortOrder(id, sortOrder) }; }
    catch (err) { return { success: false, error: err.message }; }
  });
  ipcMain.handle('dayPlan:delete', (_, id) => {
    try {
      // FK ON DELETE CASCADE drops intraday_note rows + day_plan_screenshot rows automatically.
      // We still manually delete screenshot files first so the disk doesn't leak.
      dayPlanScreenshotRepo.deleteByDayPlan(id);
      dayPlanRepo.delete(id);
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  });

  // --- Day Plan Screenshot handlers ---
  ipcMain.handle('dayPlanScreenshot:getByDayPlan', (_, dayPlanId, kind) =>
    dayPlanScreenshotRepo.getByDayPlan(dayPlanId, kind)
  );
  ipcMain.handle('dayPlanScreenshot:create', (_, data) => dayPlanScreenshotRepo.create(data));
  ipcMain.handle('dayPlanScreenshot:delete', (_, id) => dayPlanScreenshotRepo.delete(id));
}
