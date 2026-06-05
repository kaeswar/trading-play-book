const { getDb } = require('./database');
const planTemplateRepo = require('./planTemplateRepo');

// Joins symbol name and template screenshot so the UI can show them without extra queries.
const SELECT_COLS = `
  sp.*,
  s.name AS symbol_name,
  pt.screenshot_path AS template_screenshot_path
`;

module.exports = {
  // Filters: { symbolId, executionStatus, timeframe, biases (array) | bias, query, activeOnly }
  search(filters = {}) {
    let sql = `
      SELECT ${SELECT_COLS}
      FROM swing_plan sp
      JOIN symbol s ON sp.symbol_id = s.id
      LEFT JOIN plan_template pt ON sp.template_id = pt.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.symbolId) {
      sql += ' AND sp.symbol_id = ?';
      params.push(filters.symbolId);
    }

    if (filters.query && filters.query.trim()) {
      sql += ' AND (sp.name LIKE ? OR s.name LIKE ?)';
      const like = `%${filters.query.trim()}%`;
      params.push(like, like);
    }

    if (filters.activeOnly) {
      sql += " AND sp.execution_status = 'Waiting'";
    } else if (filters.executionStatus) {
      sql += ' AND sp.execution_status = ?';
      params.push(filters.executionStatus);
    }

    if (filters.timeframe) {
      sql += ' AND sp.timeframe = ?';
      params.push(filters.timeframe);
    }

    // Bias filter — supports array or single
    const biasList = Array.isArray(filters.biases) && filters.biases.length > 0
      ? filters.biases
      : (filters.bias ? [filters.bias] : []);
    if (biasList.length > 0) {
      const placeholders = biasList.map(() => '?').join(',');
      sql += ` AND sp.bias IN (${placeholders})`;
      params.push(...biasList);
    }

    if (filters.templateId) {
      sql += ' AND sp.template_id = ?';
      params.push(filters.templateId);
    }

    if (filters.dateFrom) {
      sql += ' AND sp.plan_date >= ?';
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      sql += ' AND sp.plan_date <= ?';
      params.push(filters.dateTo);
    }

    sql += ' ORDER BY sp.plan_date DESC, sp.updated_at DESC';
    return getDb().prepare(sql).all(...params);
  },

  getById(id) {
    return getDb().prepare(`
      SELECT ${SELECT_COLS}
      FROM swing_plan sp
      JOIN symbol s ON sp.symbol_id = s.id
      LEFT JOIN plan_template pt ON sp.template_id = pt.id
      WHERE sp.id = ?
    `).get(id);
  },

  // Pick a template + apply to a specific stock — snapshot template fields into a new swing_plan row.
  createFromTemplate({
    templateId, symbolId, planDate, timeframe,
    entryPrice, targetPrice, stopLoss, analysis,
  }) {
    const tpl = planTemplateRepo.getById(templateId);
    if (!tpl) throw new Error('Template not found');
    if (!symbolId)  throw new Error('Symbol is required');
    if (!timeframe) throw new Error('Timeframe is required');

    const result = getDb().prepare(`
      INSERT INTO swing_plan
        (template_id, symbol_id, plan_date,
         name, description, group_name, bias, behavior_tag,
         timeframe, entry_price, target_price, stop_loss, analysis)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      templateId,
      symbolId,
      planDate || new Date().toISOString().slice(0, 10),
      tpl.name,
      tpl.description || null,
      tpl.group_name || null,
      tpl.bias,
      tpl.behavior_tag || null,
      timeframe,
      entryPrice ?? null,
      targetPrice ?? null,
      stopLoss ?? null,
      analysis || null,
    );

    planTemplateRepo.incrementUsage(templateId);

    return this.getById(result.lastInsertRowid);
  },

  // Update the editable per-instance fields (kept separate from execution updates).
  updateNumbers(id, { symbolId, planDate, timeframe, entryPrice, targetPrice, stopLoss, analysis }) {
    getDb().prepare(`
      UPDATE swing_plan SET
        symbol_id = ?, plan_date = ?, timeframe = ?,
        entry_price = ?, target_price = ?, stop_loss = ?, analysis = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      symbolId, planDate, timeframe,
      entryPrice ?? null, targetPrice ?? null, stopLoss ?? null, analysis || null,
      id,
    );
    return this.getById(id);
  },

  // Post-market: execution status + outcome notes.
  updateExecution(id, { executionStatus, outcomeNotes }) {
    getDb().prepare(`
      UPDATE swing_plan SET
        execution_status = ?, outcome_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(executionStatus || 'Waiting', outcomeNotes || null, id);
    return this.getById(id);
  },

  delete(id) {
    return getDb().prepare('DELETE FROM swing_plan WHERE id = ?').run(id);
  },

  // Distinct symbols that have at least one swing_plan — used by Gallery filter dropdowns.
  getDistinctSymbols() {
    return getDb().prepare(`
      SELECT DISTINCT s.id, s.name
      FROM swing_plan sp
      JOIN symbol s ON sp.symbol_id = s.id
      LEFT JOIN plan_template pt ON sp.template_id = pt.id
      ORDER BY s.name COLLATE NOCASE ASC
    `).all();
  },

  // Templates that have at least one swing_plan OR day_plan instance — used by Plan Wise export dropdown.
  getDistinctTemplates() {
    return getDb().prepare(`
      SELECT template_id AS id, name, group_name, COUNT(*) AS plan_count
      FROM (
        SELECT sp.template_id, sp.name, sp.group_name FROM swing_plan sp WHERE sp.template_id IS NOT NULL
        UNION ALL
        SELECT dp.template_id, dp.name, dp.group_name FROM day_plan dp WHERE dp.template_id IS NOT NULL
      )
      GROUP BY template_id, name, group_name
      ORDER BY name COLLATE NOCASE ASC
    `).all();
  },

  // Distinct symbols for a template across both swing_plan and day_plan — used by Plan Wise export.
  getDistinctSymbolsByTemplate(templateId) {
    return getDb().prepare(`
      SELECT DISTINCT s.id, s.name
      FROM (
        SELECT sp.symbol_id FROM swing_plan sp WHERE sp.template_id = ?
        UNION
        SELECT td.symbol_id FROM day_plan dp
        JOIN trading_day td ON dp.trading_day_id = td.id
        WHERE dp.template_id = ?
      ) t
      JOIN symbol s ON t.symbol_id = s.id
      ORDER BY s.name COLLATE NOCASE ASC
    `).all(templateId, templateId);
  },
};
