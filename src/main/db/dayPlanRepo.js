const { getDb } = require('./database');
const planTemplateRepo = require('./planTemplateRepo');

module.exports = {
  getByTradingDay(tradingDayId) {
    return getDb().prepare(`
      SELECT * FROM day_plan
      WHERE trading_day_id = ?
      ORDER BY sort_order, id
    `).all(tradingDayId);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM day_plan WHERE id = ?').get(id);
  },

  // Snapshot template fields into a new day_plan row.
  createFromTemplate({ tradingDayId, templateId, sortOrder = 0 }) {
    const tpl = planTemplateRepo.getById(templateId);
    if (!tpl) throw new Error('Template not found');

    const result = getDb().prepare(`
      INSERT INTO day_plan
        (trading_day_id, template_id, name, description, group_name,
         bias, behavior_tag, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tradingDayId,
      templateId,
      tpl.name,
      tpl.description || null,
      tpl.group_name || null,
      tpl.bias,
      tpl.behavior_tag || null,
      sortOrder,
    );

    planTemplateRepo.incrementUsage(templateId);

    return this.getById(result.lastInsertRowid);
  },

  // Pre-market: target + stop_out (numbers).
  updateNumbers(id, { target, stopOut }) {
    getDb().prepare(`
      UPDATE day_plan SET
        target = ?, stop_out = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(target ?? null, stopOut ?? null, id);
    return this.getById(id);
  },

  // Post-market: execution outcome + free-text notes.
  updateExecution(id, { executionStatus, outcomeNotes }) {
    getDb().prepare(`
      UPDATE day_plan SET
        execution_status = ?, outcome_notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(executionStatus || 'Waiting', outcomeNotes || null, id);
    return this.getById(id);
  },

  updateSortOrder(id, sortOrder) {
    getDb().prepare(
      'UPDATE day_plan SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(sortOrder, id);
    return this.getById(id);
  },

  // All day plans for a given template, joined with trading_day + symbol for export.
  getByTemplateId(templateId) {
    return getDb().prepare(`
      SELECT dp.*,
             td.trade_date AS plan_date,
             s.id          AS symbol_id,
             s.name        AS symbol_name
      FROM day_plan dp
      JOIN trading_day td ON dp.trading_day_id = td.id
      JOIN symbol s       ON td.symbol_id = s.id
      WHERE dp.template_id = ?
      ORDER BY td.trade_date DESC
    `).all(templateId);
  },

  delete(id) {
    return getDb().prepare('DELETE FROM day_plan WHERE id = ?').run(id);
  },
};
