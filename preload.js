const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Symbol
  symbol: {
    getAll: () => ipcRenderer.invoke('symbol:getAll'),
    getActive: () => ipcRenderer.invoke('symbol:getActive'),
    create: (name) => ipcRenderer.invoke('symbol:create', name),
    setInactive: (id) => ipcRenderer.invoke('symbol:setInactive', id),
  },

  // Trading Day
  tradingDay: {
    getById: (id) => ipcRenderer.invoke('tradingDay:getById', id),
    getByDateAndSymbol: (date, symbolId) =>
      ipcRenderer.invoke('tradingDay:getByDateAndSymbol', date, symbolId),
    getAll: () => ipcRenderer.invoke('tradingDay:getAll'),
    create: (data) => ipcRenderer.invoke('tradingDay:create', data),
    updateNotes: (id, notes) => ipcRenderer.invoke('tradingDay:updateNotes', id, notes),
    updateDate: (id, newDate) => ipcRenderer.invoke('tradingDay:updateDate', id, newDate),
    delete: (id) => ipcRenderer.invoke('tradingDay:delete', id),
    getAvailableDates: (symbolId) => ipcRenderer.invoke('tradingDay:getAvailableDates', symbolId),
  },

  // Possibility
  possibility: {
    getByTradingDay: (tradingDayId) =>
      ipcRenderer.invoke('possibility:getByTradingDay', tradingDayId),
    create: (data) => ipcRenderer.invoke('possibility:create', data),
    updateHasPlan: (id, hasPlan) =>
      ipcRenderer.invoke('possibility:updateHasPlan', id, hasPlan),
  },

  // Outcome Plan
  outcomePlan: {
    getByPossibility: (possibilityId) =>
      ipcRenderer.invoke('outcomePlan:getByPossibility', possibilityId),
    create: (data) => ipcRenderer.invoke('outcomePlan:create', data),
    update: (id, data) => ipcRenderer.invoke('outcomePlan:update', id, data),
    delete: (id) => ipcRenderer.invoke('outcomePlan:delete', id),
  },

  // Screenshot
  screenshot: {
    getByOutcomePlan: (outcomePlanId) =>
      ipcRenderer.invoke('screenshot:getByOutcomePlan', outcomePlanId),
    create: (data) => ipcRenderer.invoke('screenshot:create', data),
    delete: (id) => ipcRenderer.invoke('screenshot:delete', id),
  },

  // Verdict
  verdict: {
    getByTradingDay: (tradingDayId) =>
      ipcRenderer.invoke('verdict:getByTradingDay', tradingDayId),
    create: (data) => ipcRenderer.invoke('verdict:create', data),
    update: (id, data) => ipcRenderer.invoke('verdict:update', id, data),
  },

  // Verdict Screenshot
  verdictScreenshot: {
    getByVerdict: (verdictId) =>
      ipcRenderer.invoke('verdictScreenshot:getByVerdict', verdictId),
    create: (data) => ipcRenderer.invoke('verdictScreenshot:create', data),
    delete: (id) => ipcRenderer.invoke('verdictScreenshot:delete', id),
  },

  // Image
  image: {
    import: (sourcePath, symbolName, date, fileName) =>
      ipcRenderer.invoke('image:import', sourcePath, symbolName, date, fileName),
    getFullPath: (relativePath) =>
      ipcRenderer.invoke('image:getFullPath', relativePath),
    toDataUrl: (filePath) =>
      ipcRenderer.invoke('image:toDataUrl', filePath),
    saveBuffer: (uint8Array, symbolName, date, fileName) =>
      ipcRenderer.invoke('image:saveBuffer', uint8Array, symbolName, date, fileName),
    openExternal: (relativePath) =>
      ipcRenderer.invoke('image:openExternal', relativePath),
    openViewer: (relativePath) =>
      ipcRenderer.invoke('image:openViewer', relativePath),
  },

  // Dialog
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
  },

  // Query
  query: {
    getFilteredDays: (filters) => ipcRenderer.invoke('query:getFilteredDays', filters),
    getMetrics: (symbolId) => ipcRenderer.invoke('query:getMetrics', symbolId),
  },

  // Custom Plan
  customPlan: {
    getByTradingDay: (tradingDayId) =>
      ipcRenderer.invoke('customPlan:getByTradingDay', tradingDayId),
    getById: (id) => ipcRenderer.invoke('customPlan:getById', id),
    create: (data) => ipcRenderer.invoke('customPlan:create', data),
    update: (id, data) => ipcRenderer.invoke('customPlan:update', id, data),
    updateVerdict: (id, data) => ipcRenderer.invoke('customPlan:updateVerdict', id, data),
    delete: (id) => ipcRenderer.invoke('customPlan:delete', id),
  },

  // Custom Plan Screenshot
  customPlanScreenshot: {
    getByCustomPlan: (customPlanId) =>
      ipcRenderer.invoke('customPlanScreenshot:getByCustomPlan', customPlanId),
    create: (data) => ipcRenderer.invoke('customPlanScreenshot:create', data),
    delete: (id) => ipcRenderer.invoke('customPlanScreenshot:delete', id),
  },

  // Intraday Note
  intradayNote: {
    getByOutcomePlan: (outcomePlanId) =>
      ipcRenderer.invoke('intradayNote:getByOutcomePlan', outcomePlanId),
    getByCustomPlan: (customPlanId) =>
      ipcRenderer.invoke('intradayNote:getByCustomPlan', customPlanId),
    getByTradingDay: (tradingDayId) =>
      ipcRenderer.invoke('intradayNote:getByTradingDay', tradingDayId),
    countByTradingDay: (tradingDayId) =>
      ipcRenderer.invoke('intradayNote:countByTradingDay', tradingDayId),
    create: (data) => ipcRenderer.invoke('intradayNote:create', data),
    update: (id, data) => ipcRenderer.invoke('intradayNote:update', id, data),
    updateAttachment: (id, data) => ipcRenderer.invoke('intradayNote:updateAttachment', id, data),
    delete: (id) => ipcRenderer.invoke('intradayNote:delete', id),
  },

  // Intraday Note Screenshot
  intradayNoteScreenshot: {
    getByIntradayNote: (intradayNoteId) =>
      ipcRenderer.invoke('intradayNoteScreenshot:getByIntradayNote', intradayNoteId),
    create: (data) => ipcRenderer.invoke('intradayNoteScreenshot:create', data),
    delete: (id) => ipcRenderer.invoke('intradayNoteScreenshot:delete', id),
  },

  // Export
  export: {
    toCSV: (params) => ipcRenderer.invoke('export:toCSV', params),
    toPDF: (params) => ipcRenderer.invoke('export:toPDF', params),
    swingToCSV: (params) => ipcRenderer.invoke('export:swingToCSV', params),
    swingToPDF: (params) => ipcRenderer.invoke('export:swingToPDF', params),
  },

  // Backup / Restore
  backup: {
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import'),
  },

  // Reports
  report: {
    intraday: (symbolId) => ipcRenderer.invoke('report:intraday', symbolId || null),
    swing:    ()         => ipcRenderer.invoke('report:swing'),
  },

  // Stock Plan
  stockPlan: {
    getAll: () => ipcRenderer.invoke('stockPlan:getAll'),
    getById: (id) => ipcRenderer.invoke('stockPlan:getById', id),
    create: (data) => ipcRenderer.invoke('stockPlan:create', data),
    update: (id, data) => ipcRenderer.invoke('stockPlan:update', id, data),
    updateExecutionStatus: (id, status) =>
      ipcRenderer.invoke('stockPlan:updateExecutionStatus', id, status),
    delete: (id) => ipcRenderer.invoke('stockPlan:delete', id),
    search: (filters) => ipcRenderer.invoke('stockPlan:search', filters),
    getDistinctStockNames: () => ipcRenderer.invoke('stockPlan:getDistinctStockNames'),
  },
});
