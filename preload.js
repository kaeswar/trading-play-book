const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Symbol
  symbol: {
    getAll: () => ipcRenderer.invoke('symbol:getAll'),
    getActive: () => ipcRenderer.invoke('symbol:getActive'),
    create: (name) => ipcRenderer.invoke('symbol:create', name),
    setInactive: (id) => ipcRenderer.invoke('symbol:setInactive', id),
    rename: (id, name) => ipcRenderer.invoke('symbol:rename', id, name),
    updateDhanConfig: (id, cfg) => ipcRenderer.invoke('symbol:updateDhanConfig', id, cfg),
  },

  // Trading Day
  tradingDay: {
    getById: (id) => ipcRenderer.invoke('tradingDay:getById', id),
    getByDateAndSymbol: (date, symbolId) =>
      ipcRenderer.invoke('tradingDay:getByDateAndSymbol', date, symbolId),
    getAll: () => ipcRenderer.invoke('tradingDay:getAll'),
    create: (data) => ipcRenderer.invoke('tradingDay:create', data),
    createWithPlans: (data) => ipcRenderer.invoke('tradingDay:createWithPlans', data),
    updateNotes: (id, notes) => ipcRenderer.invoke('tradingDay:updateNotes', id, notes),
    updateDate: (id, newDate) => ipcRenderer.invoke('tradingDay:updateDate', id, newDate),
    delete: (id) => ipcRenderer.invoke('tradingDay:delete', id),
    getAvailableDates: (symbolId) => ipcRenderer.invoke('tradingDay:getAvailableDates', symbolId),
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

  // Session Journal (Market Profile)
  journal: {
    createSession:         (data)                      => ipcRenderer.invoke('journal:createSession', data),
    getSessions:           ()                          => ipcRenderer.invoke('journal:getSessions'),
    getSession:            (id)                        => ipcRenderer.invoke('journal:getSession', id),
    saveEntry:             (id, data)                  => ipcRenderer.invoke('journal:saveEntry', id, data),
    insertStructureEvent:  (sessionId, afterSortOrder) => ipcRenderer.invoke('journal:insertStructureEvent', sessionId, afterSortOrder),
    deleteEntry:           (id)                        => ipcRenderer.invoke('journal:deleteEntry', id),
    deleteSession:         (id)                        => ipcRenderer.invoke('journal:deleteSession', id),
    getPresessionData:     ()                          => ipcRenderer.invoke('journal:getPresessionData'),
    fetchTpoOhlc:          (params)                    => ipcRenderer.invoke('journal:fetchTpoOhlc', params),
    exportMarkdown:        (content, defaultFilename)  => ipcRenderer.invoke('journal:exportMarkdown', { content, defaultFilename }),
  },

  // Broker Integration
  broker: {
    getConfig:      ()    => ipcRenderer.invoke('broker:getConfig'),
    setConfig:      (cfg) => ipcRenderer.invoke('broker:setConfig', cfg),
    testConnection: ()    => ipcRenderer.invoke('broker:testConnection'),
  },

  // Day-Level Intraday Note (per trading_day, not scoped to a plan)
  dayIntradayNote: {
    getByTradingDay: (tradingDayId) => ipcRenderer.invoke('dayIntradayNote:getByTradingDay', tradingDayId),
    count:           (tradingDayId) => ipcRenderer.invoke('dayIntradayNote:count', tradingDayId),
    create:          (data)         => ipcRenderer.invoke('dayIntradayNote:create', data),
    update:          (id, data)     => ipcRenderer.invoke('dayIntradayNote:update', id, data),
    delete:          (id)           => ipcRenderer.invoke('dayIntradayNote:delete', id),
  },

  dayIntradayNoteScreenshot: {
    getByNote: (noteId) => ipcRenderer.invoke('dayIntradayNoteScreenshot:getByNote', noteId),
    create:    (data)   => ipcRenderer.invoke('dayIntradayNoteScreenshot:create', data),
    delete:    (id)     => ipcRenderer.invoke('dayIntradayNoteScreenshot:delete', id),
  },

  // Intraday Note (per day_plan)
  intradayNote: {
    getByDayPlan:      (dayPlanId)    => ipcRenderer.invoke('intradayNote:getByDayPlan', dayPlanId),
    getByTradingDay:   (tradingDayId) => ipcRenderer.invoke('intradayNote:getByTradingDay', tradingDayId),
    countByTradingDay: (tradingDayId) => ipcRenderer.invoke('intradayNote:countByTradingDay', tradingDayId),
    create:            (data)         => ipcRenderer.invoke('intradayNote:create', data),
    update:            (id, data)     => ipcRenderer.invoke('intradayNote:update', id, data),
    delete:            (id)           => ipcRenderer.invoke('intradayNote:delete', id),
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
    swingToCSV:    (params) => ipcRenderer.invoke('export:swingToCSV', params),
    swingToPDF:    (params) => ipcRenderer.invoke('export:swingToPDF', params),
    planWiseToCSV: (params) => ipcRenderer.invoke('export:planWiseToCSV', params),
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

  // Swing Plan (template-instance pattern)
  swingPlan: {
    search:             (filters)    => ipcRenderer.invoke('swingPlan:search', filters || {}),
    get:                (id)         => ipcRenderer.invoke('swingPlan:get', id),
    createFromTemplate: (data)       => ipcRenderer.invoke('swingPlan:createFromTemplate', data),
    updateNumbers:      (id, data)   => ipcRenderer.invoke('swingPlan:updateNumbers', id, data),
    updateExecution:    (id, data)   => ipcRenderer.invoke('swingPlan:updateExecution', id, data),
    delete:             (id)         => ipcRenderer.invoke('swingPlan:delete', id),
    getDistinctSymbols:            ()           => ipcRenderer.invoke('swingPlan:getDistinctSymbols'),
    getDistinctSymbolsByTemplate:  (templateId) => ipcRenderer.invoke('swingPlan:getDistinctSymbolsByTemplate', templateId),
    getDistinctTemplates:          ()           => ipcRenderer.invoke('swingPlan:getDistinctTemplates'),
  },

  swingPlanScreenshot: {
    getBySwingPlan: (swingPlanId, kind) =>
      ipcRenderer.invoke('swingPlanScreenshot:getBySwingPlan', swingPlanId, kind || null),
    create: (data) => ipcRenderer.invoke('swingPlanScreenshot:create', data),
    delete: (id)   => ipcRenderer.invoke('swingPlanScreenshot:delete', id),
  },

  // Plan Group (template library)
  planGroup: {
    list:   ()         => ipcRenderer.invoke('planGroup:list'),
    create: (data)     => ipcRenderer.invoke('planGroup:create', data),
    update: (id, data) => ipcRenderer.invoke('planGroup:update', id, data),
    delete: (id)       => ipcRenderer.invoke('planGroup:delete', id),
  },

  // Plan Template (template library)
  planTemplate: {
    list:    (filters)        => ipcRenderer.invoke('planTemplate:list', filters || {}),
    get:     (id)             => ipcRenderer.invoke('planTemplate:get', id),
    create:  (data)           => ipcRenderer.invoke('planTemplate:create', data),
    update:  (id, data)       => ipcRenderer.invoke('planTemplate:update', id, data),
    archive: (id, archived)   => ipcRenderer.invoke('planTemplate:archive', id, !!archived),
    delete:  (id)             => ipcRenderer.invoke('planTemplate:delete', id),
    clone:   (id, name)       => ipcRenderer.invoke('planTemplate:clone', id, name || null),
    attachScreenshot:           (id, srcPath, fileName) => ipcRenderer.invoke('planTemplate:attachScreenshot', id, srcPath, fileName),
    attachScreenshotFromBuffer: (id, uint8Array, fileName) => ipcRenderer.invoke('planTemplate:attachScreenshotFromBuffer', id, uint8Array, fileName),
    removeScreenshot:           (id)                    => ipcRenderer.invoke('planTemplate:removeScreenshot', id),
    openViewer: (templateData) => ipcRenderer.invoke('planTemplate:openViewer', templateData),
  },

  // Day Plan (instance picked for a day from a template)
  dayPlan: {
    getByTradingDay:    (tradingDayId) => ipcRenderer.invoke('dayPlan:getByTradingDay', tradingDayId),
    get:                (id)           => ipcRenderer.invoke('dayPlan:get', id),
    createFromTemplate: (data)         => ipcRenderer.invoke('dayPlan:createFromTemplate', data),
    updateNumbers:      (id, data)     => ipcRenderer.invoke('dayPlan:updateNumbers', id, data),
    updateExecution:    (id, data)     => ipcRenderer.invoke('dayPlan:updateExecution', id, data),
    updateSortOrder:    (id, n)        => ipcRenderer.invoke('dayPlan:updateSortOrder', id, n),
    delete:             (id)           => ipcRenderer.invoke('dayPlan:delete', id),
  },

  dayPlanScreenshot: {
    getByDayPlan: (dayPlanId, kind) => ipcRenderer.invoke('dayPlanScreenshot:getByDayPlan', dayPlanId, kind || null),
    create:       (data)            => ipcRenderer.invoke('dayPlanScreenshot:create', data),
    delete:       (id)              => ipcRenderer.invoke('dayPlanScreenshot:delete', id),
  },

  // Main → Renderer events (menu actions)
  on: (channel, callback) => {
    const allowed = ['menu:open-about', 'menu:open-guide'];
    if (allowed.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },
});
