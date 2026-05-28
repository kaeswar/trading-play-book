const { getDb } = require('./database');

module.exports = {
  getByTradingDay(tradingDayId) {
    return getDb().prepare(
      'SELECT * FROM custom_plan WHERE trading_day_id = ? ORDER BY created_at'
    ).all(tradingDayId);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM custom_plan WHERE id = ?').get(id);
  },

  create({ tradingDayId, title, tradePlan, biasTag, target, stopOut }) {
    const result = getDb().prepare(
      'INSERT INTO custom_plan (trading_day_id, title, trade_plan, bias_tag, target, stop_out) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(tradingDayId, title || '', tradePlan || '', biasTag || null, target || null, stopOut || null);
    return this.getById(result.lastInsertRowid);
  },

  update(id, { title, tradePlan, biasTag, target, stopOut }) {
    getDb().prepare(
      'UPDATE custom_plan SET title = ?, trade_plan = ?, bias_tag = ?, target = ?, stop_out = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(title || '', tradePlan || '', biasTag || null, target || null, stopOut || null, id);
    return this.getById(id);
  },

  updateVerdict(id, { verdictStatus, verdictNotes }) {
    getDb().prepare(
      'UPDATE custom_plan SET verdict_status = ?, verdict_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(verdictStatus || null, verdictNotes || null, id);
    return this.getById(id);
  },

  delete(id) {
    return getDb().prepare('DELETE FROM custom_plan WHERE id = ?').run(id);
  },
};
