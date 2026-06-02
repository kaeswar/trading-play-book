const { getDb } = require('./database');

module.exports = {
  getByDayPlan(dayPlanId) {
    return getDb().prepare(
      'SELECT * FROM intraday_note WHERE day_plan_id = ? ORDER BY sort_order, note_time'
    ).all(dayPlanId);
  },

  getByTradingDay(tradingDayId) {
    return getDb().prepare(
      'SELECT * FROM intraday_note WHERE trading_day_id = ? ORDER BY sort_order, note_time'
    ).all(tradingDayId);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM intraday_note WHERE id = ?').get(id);
  },

  create({ tradingDayId, dayPlanId, noteTime, action, status }) {
    if (!dayPlanId) throw new Error('dayPlanId is required');
    const result = getDb().prepare(
      'INSERT INTO intraday_note (trading_day_id, day_plan_id, note_time, action, status) VALUES (?, ?, ?, ?, ?)'
    ).run(tradingDayId, dayPlanId, noteTime, action || '', status || 'Not-Known');
    return this.getById(result.lastInsertRowid);
  },

  update(id, { noteTime, action, status }) {
    getDb().prepare(
      'UPDATE intraday_note SET note_time = ?, action = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(noteTime, action || '', status || 'Not-Known', id);
    return this.getById(id);
  },

  delete(id) {
    return getDb().prepare('DELETE FROM intraday_note WHERE id = ?').run(id);
  },

  deleteByDayPlan(dayPlanId) {
    return getDb().prepare('DELETE FROM intraday_note WHERE day_plan_id = ?').run(dayPlanId);
  },

  // Returns { [dayPlanId]: count }
  countByTradingDay(tradingDayId) {
    const rows = getDb().prepare(
      `SELECT day_plan_id AS dayPlanId, COUNT(*) AS cnt
       FROM intraday_note WHERE trading_day_id = ?
       GROUP BY day_plan_id`
    ).all(tradingDayId);
    const counts = {};
    for (const r of rows) counts[r.dayPlanId] = r.cnt;
    return counts;
  },
};
