const { getDb } = require('./database');

module.exports = {
  getAll() {
    return getDb().prepare(
      'SELECT * FROM stock_plan ORDER BY updated_at DESC'
    ).all();
  },

  getById(id) {
    return getDb().prepare(
      'SELECT * FROM stock_plan WHERE id = ?'
    ).get(id);
  },

  create({ stockName, timeframe, analysis, entryPrice, targetPrice, stopLoss, chartPath }) {
    const result = getDb().prepare(
      `INSERT INTO stock_plan (stock_name, timeframe, analysis, entry_price, target_price, stop_loss, chart_path)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      stockName,
      timeframe,
      analysis || null,
      entryPrice ?? null,
      targetPrice ?? null,
      stopLoss ?? null,
      chartPath || null
    );
    return this.getById(result.lastInsertRowid);
  },

  update(id, { stockName, timeframe, analysis, entryPrice, targetPrice, stopLoss, chartPath }) {
    getDb().prepare(
      `UPDATE stock_plan
       SET stock_name = ?, timeframe = ?, analysis = ?,
           entry_price = ?, target_price = ?, stop_loss = ?,
           chart_path = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      stockName,
      timeframe,
      analysis || null,
      entryPrice ?? null,
      targetPrice ?? null,
      stopLoss ?? null,
      chartPath || null,
      id
    );
    return this.getById(id);
  },

  updateExecutionStatus(id, executionStatus) {
    getDb().prepare(
      'UPDATE stock_plan SET execution_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(executionStatus, id);
    return this.getById(id);
  },

  delete(id) {
    const plan = this.getById(id);
    if (plan && plan.chart_path) {
      const path = require('path');
      const fs = require('fs');
      const { app } = require('electron');
      const fullPath = path.join(app.getPath('userData'), plan.chart_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    return getDb().prepare('DELETE FROM stock_plan WHERE id = ?').run(id);
  },

  search({ query, executionStatus, timeframe }) {
    let sql = 'SELECT * FROM stock_plan WHERE 1=1';
    const params = [];

    if (query && query.trim()) {
      sql += ' AND stock_name LIKE ?';
      params.push(`%${query.trim()}%`);
    }

    if (executionStatus) {
      sql += ' AND execution_status = ?';
      params.push(executionStatus);
    }

    if (timeframe) {
      sql += ' AND timeframe = ?';
      params.push(timeframe);
    }

    sql += ' ORDER BY updated_at DESC';
    return getDb().prepare(sql).all(...params);
  },

  getDistinctStockNames() {
    return getDb().prepare(
      'SELECT DISTINCT stock_name FROM stock_plan ORDER BY stock_name'
    ).all().map((r) => r.stock_name);
  },
};
