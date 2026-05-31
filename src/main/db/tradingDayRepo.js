const { getDb } = require('./database');

module.exports = {
  getById(id) {
    const db = getDb();
    const day = db.prepare(`
      SELECT td.*, s.name as symbol_name
      FROM trading_day td
      JOIN symbol s ON td.symbol_id = s.id
      WHERE td.id = ?
    `).get(id);
    return day;
  },

  getByDateAndSymbol(date, symbolId) {
    return getDb().prepare(
      'SELECT * FROM trading_day WHERE trade_date = ? AND symbol_id = ?'
    ).get(date, symbolId);
  },

  getAll() {
    return getDb().prepare(`
      SELECT td.*, s.name as symbol_name,
        (SELECT v.possibility_code FROM verdict v WHERE v.trading_day_id = td.id) as verdict_code,
        (SELECT v.outcome FROM verdict v WHERE v.trading_day_id = td.id) as verdict_outcome,
        (SELECT v.bias FROM verdict v WHERE v.trading_day_id = td.id) as verdict_bias,
        (SELECT v.had_plan FROM verdict v WHERE v.trading_day_id = td.id) as verdict_had_plan
      FROM trading_day td
      JOIN symbol s ON td.symbol_id = s.id
      ORDER BY td.trade_date DESC, s.name
    `).all();
  },

  create({ tradeDate, symbolId, notes }) {
    const db = getDb();
    const result = db.prepare(
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
    // Delete associated screenshot files first
    const screenshots = getDb().prepare(
      `SELECT ss.file_path FROM screenshot ss
       JOIN outcome_plan op ON ss.outcome_plan_id = op.id
       JOIN possibility p ON op.possibility_id = p.id
       WHERE p.trading_day_id = ?`
    ).all(id);

    const path = require('path');
    const fs = require('fs');
    const { app } = require('electron');
    for (const ss of screenshots) {
      const fullPath = path.join(app.getPath('userData'), ss.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    // Delete associated verdict screenshot files
    const verdictScreenshots = getDb().prepare(
      `SELECT vs.file_path FROM verdict_screenshot vs
       JOIN verdict v ON vs.verdict_id = v.id
       WHERE v.trading_day_id = ?`
    ).all(id);

    for (const vs of verdictScreenshots) {
      const fullPath = path.join(app.getPath('userData'), vs.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    // Delete associated custom plan screenshot files
    const customPlanScreenshots = getDb().prepare(
      `SELECT cps.file_path FROM custom_plan_screenshot cps
       JOIN custom_plan cp ON cps.custom_plan_id = cp.id
       WHERE cp.trading_day_id = ?`
    ).all(id);

    for (const cps of customPlanScreenshots) {
      const fullPath = path.join(app.getPath('userData'), cps.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    // Delete associated intraday note screenshot files
    const intradayNoteScreenshots = getDb().prepare(
      `SELECT ins.file_path FROM intraday_note_screenshot ins
       JOIN intraday_note ON ins.intraday_note_id = intraday_note.id
       LEFT JOIN outcome_plan op ON intraday_note.outcome_plan_id = op.id
       LEFT JOIN possibility p ON op.possibility_id = p.id
       LEFT JOIN custom_plan cp ON intraday_note.custom_plan_id = cp.id
       WHERE p.trading_day_id = ? OR cp.trading_day_id = ?`
    ).all(id, id);

    for (const ins of intradayNoteScreenshots) {
      const fullPath = path.join(app.getPath('userData'), ins.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    return getDb().prepare('DELETE FROM trading_day WHERE id = ?').run(id);
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

  getFiltered(filters = {}) {
    const db = getDb();
    let sql = `
      SELECT td.*, s.name as symbol_name,
        v.id as verdict_id,
        v.possibility_code as verdict_code,
        v.outcome as verdict_outcome,
        v.bias as verdict_bias,
        v.had_plan as verdict_had_plan,
        v.notes as verdict_notes,
        (SELECT GROUP_CONCAT(ss.file_path, '||')
         FROM possibility p
         JOIN outcome_plan op ON op.possibility_id = p.id
         JOIN screenshot ss ON ss.outcome_plan_id = op.id
         WHERE p.trading_day_id = td.id
        ) as screenshot_paths,
        (SELECT GROUP_CONCAT(cp.verdict_status, '||')
         FROM custom_plan cp
         WHERE cp.trading_day_id = td.id AND cp.verdict_status IS NOT NULL
        ) as custom_plan_verdicts
      FROM trading_day td
      JOIN symbol s ON td.symbol_id = s.id
      LEFT JOIN verdict v ON v.trading_day_id = td.id
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

    if (filters.possibilityCode) {
      sql += ' AND v.possibility_code = ?';
      params.push(filters.possibilityCode);
    }

    if (filters.outcome) {
      sql += ` AND (v.outcome = ? OR EXISTS (
        SELECT 1 FROM custom_plan cp
        WHERE cp.trading_day_id = td.id AND cp.verdict_status = ?
      ))`;
      params.push(filters.outcome, filters.outcome);
    }

    if (filters.bias) {
      sql += ` AND (v.bias = ? OR EXISTS (
        SELECT 1 FROM custom_plan cp
        WHERE cp.trading_day_id = td.id AND cp.bias_tag = ?
      ))`;
      params.push(filters.bias, filters.bias);
    }

    if (filters.prepared === true) {
      sql += ` AND (v.had_plan = 1 OR EXISTS (
        SELECT 1 FROM custom_plan cp WHERE cp.trading_day_id = td.id
      ))`;
    } else if (filters.prepared === false) {
      sql += ` AND (v.had_plan = 0 OR (v.had_plan IS NULL AND NOT EXISTS (
        SELECT 1 FROM custom_plan cp WHERE cp.trading_day_id = td.id
      )))`;
    }

    sql += ' ORDER BY td.trade_date DESC, s.name';
    return db.prepare(sql).all(...params);
  },
};
