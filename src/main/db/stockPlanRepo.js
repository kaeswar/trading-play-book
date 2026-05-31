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

  create({ symbolId, stockName, timeframe, analysis, entryPrice, targetPrice, stopLoss, chartPath }) {
    const result = getDb().prepare(
      `INSERT INTO stock_plan (symbol_id, stock_name, timeframe, analysis, entry_price, target_price, stop_loss, chart_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      symbolId ?? null,
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

  update(id, { symbolId, stockName, timeframe, analysis, entryPrice, targetPrice, stopLoss, chartPath }) {
    getDb().prepare(
      `UPDATE stock_plan
       SET symbol_id = ?, stock_name = ?, timeframe = ?, analysis = ?,
           entry_price = ?, target_price = ?, stop_loss = ?,
           chart_path = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      symbolId ?? null,
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

  search({ query, executionStatus, timeframe, activeOnly }) {
    let sql = 'SELECT * FROM stock_plan WHERE 1=1';
    const params = [];

    if (query && query.trim()) {
      sql += ' AND stock_name LIKE ?';
      params.push(`%${query.trim()}%`);
    }

    if (activeOnly) {
      sql += ' AND (execution_status IS NULL OR execution_status = ?)';
      params.push('Waiting');
    } else if (executionStatus) {
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
