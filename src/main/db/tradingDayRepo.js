const { getDb } = require('./database');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

module.exports = {
  getById(id) {
    return getDb().prepare(`
      SELECT td.*, s.name as symbol_name
      FROM trading_day td
      JOIN symbol s ON td.symbol_id = s.id
      WHERE td.id = ?
    `).get(id);
  },

  getByDateAndSymbol(date, symbolId) {
    return getDb().prepare(
      'SELECT * FROM trading_day WHERE trade_date = ? AND symbol_id = ?'
    ).get(date, symbolId);
  },

  getAll() {
    return getDb().prepare(`
      SELECT td.*, s.name as symbol_name
      FROM trading_day td
      JOIN symbol s ON td.symbol_id = s.id
      ORDER BY td.trade_date DESC, s.name
    `).all();
  },

  create({ tradeDate, symbolId, notes }) {
    const result = getDb().prepare(
      'INSERT INTO trading_day (trade_date, symbol_id, notes) VALUES (?, ?, ?)'
    ).run(tradeDate, symbolId, notes || null);
    return this.getById(result.lastInsertRowid);
  },

  updateNotes(id, notes) {
    getDb().prepare(
      'UPDATE trading_day SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(notes, id);
    return this.getById(id);
  },

  delete(id) {
    const userData = app.getPath('userData');
    const db = getDb();

    // Day plan screenshot files
    const dayPlanShots = db.prepare(`
      SELECT dps.file_path
      FROM day_plan_screenshot dps
      JOIN day_plan dp ON dps.day_plan_id = dp.id
      WHERE dp.trading_day_id = ?
    `).all(id);
    for (const ss of dayPlanShots) {
      const full = path.join(userData, ss.file_path);
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }

    // Intraday note screenshot files
    const noteShots = db.prepare(`
      SELECT ins.file_path
      FROM intraday_note_screenshot ins
      JOIN intraday_note n ON ins.intraday_note_id = n.id
      WHERE n.trading_day_id = ?
    `).all(id);
    for (const ss of noteShots) {
      const full = path.join(userData, ss.file_path);
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }

    return db.prepare('DELETE FROM trading_day WHERE id = ?').run(id);
  },

  updateDate(id, newDate) {
    const db = getDb();
    const existing = db.prepare('SELECT symbol_id FROM trading_day WHERE id = ?').get(id);
    if (!existing) throw new Error('Trading day not found');

    const conflict = db.prepare(
      'SELECT id FROM trading_day WHERE trade_date = ? AND symbol_id = ? AND id != ?'
    ).get(newDate, existing.symbol_id, id);
    if (conflict) throw new Error(`A plan already exists for ${newDate}`);

    db.prepare(
      'UPDATE trading_day SET trade_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(newDate, id);
    return this.getById(id);
  },

  getForExport({ symbolIds, dateFrom, dateTo }) {
    const db = getDb();
    const placeholders = symbolIds.map(() => '?').join(',');
    let sql = `
      SELECT td.id, td.trade_date, td.symbol_id, td.notes, s.name as symbol_name
      FROM trading_day td
      JOIN symbol s ON td.symbol_id = s.id
      WHERE td.symbol_id IN (${placeholders})
    `;
    const params = [...symbolIds];
    if (dateFrom) { sql += ' AND td.trade_date >= ?'; params.push(dateFrom); }
    if (dateTo)   { sql += ' AND td.trade_date <= ?'; params.push(dateTo); }
    sql += ' ORDER BY s.name, td.trade_date';
    return db.prepare(sql).all(...params);
  },

  getAvailableDates(symbolId) {
    const rows = getDb().prepare(
      'SELECT DISTINCT trade_date FROM trading_day WHERE symbol_id = ? ORDER BY trade_date DESC'
    ).all(symbolId);
    return rows.map((r) => r.trade_date);
  },

  // Gallery filter — aggregates day_plan + day_plan_screenshot data per day.
  // Each row includes:
  //   plan_count, successful_count, failed_count, cancelled_count, cost_to_cost_count, waiting_count,
  //   biases (comma-joined unique bias values), behavior_tags (comma-joined),
  //   screenshot_paths (||-joined)
  getFiltered(filters = {}) {
    const db = getDb();
    let sql = `
      SELECT td.id, td.trade_date, td.symbol_id, td.notes, td.created_at, td.updated_at,
        s.name as symbol_name,
        (SELECT COUNT(*) FROM day_plan dp WHERE dp.trading_day_id = td.id) AS plan_count,
        (SELECT COUNT(*) FROM day_plan dp WHERE dp.trading_day_id = td.id AND dp.execution_status = 'Successful') AS successful_count,
        (SELECT COUNT(*) FROM day_plan dp WHERE dp.trading_day_id = td.id AND dp.execution_status = 'Failed') AS failed_count,
        (SELECT COUNT(*) FROM day_plan dp WHERE dp.trading_day_id = td.id AND dp.execution_status = 'Cancelled') AS cancelled_count,
        (SELECT COUNT(*) FROM day_plan dp WHERE dp.trading_day_id = td.id AND dp.execution_status = 'Cost-to-Cost') AS cost_to_cost_count,
        (SELECT COUNT(*) FROM day_plan dp WHERE dp.trading_day_id = td.id AND dp.execution_status = 'UnPlanned') AS unplanned_count,
        (SELECT COUNT(*) FROM day_plan dp WHERE dp.trading_day_id = td.id AND (dp.execution_status = 'Waiting' OR dp.execution_status IS NULL)) AS waiting_count,
        (SELECT GROUP_CONCAT(DISTINCT dp.bias) FROM day_plan dp WHERE dp.trading_day_id = td.id) AS biases,
        (SELECT GROUP_CONCAT(DISTINCT COALESCE(dp.behavior_tag, dp.bias)) FROM day_plan dp WHERE dp.trading_day_id = td.id) AS behavior_tags,
        (SELECT GROUP_CONCAT(dps.file_path, '||')
          FROM day_plan_screenshot dps
          JOIN day_plan dp ON dps.day_plan_id = dp.id
          WHERE dp.trading_day_id = td.id
        ) AS screenshot_paths
      FROM trading_day td
      JOIN symbol s ON td.symbol_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.symbolId) {
      sql += ' AND td.symbol_id = ?';
      params.push(filters.symbolId);
    }
    if (filters.dateFrom) {
      sql += ' AND td.trade_date >= ?';
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      sql += ' AND td.trade_date <= ?';
      params.push(filters.dateTo);
    }

    if (filters.outcome) {
      sql += ` AND EXISTS (
        SELECT 1 FROM day_plan dp WHERE dp.trading_day_id = td.id AND dp.execution_status = ?
      )`;
      params.push(filters.outcome);
    }

    // Bias filter — matches if any day_plan on the day has this bias.
    const biasList = Array.isArray(filters.biases) && filters.biases.length > 0
      ? filters.biases
      : (filters.bias ? [filters.bias] : []);
    if (biasList.length > 0) {
      const placeholders = biasList.map(() => '?').join(',');
      sql += ` AND EXISTS (
        SELECT 1 FROM day_plan dp WHERE dp.trading_day_id = td.id AND dp.bias IN (${placeholders})
      )`;
      params.push(...biasList);
    }

    sql += ' ORDER BY td.trade_date DESC, s.name';
    return db.prepare(sql).all(...params);
  },
};
