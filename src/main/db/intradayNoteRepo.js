const { getDb } = require('./database');

module.exports = {
  getByOutcomePlan(outcomePlanId) {
    return getDb().prepare(
      'SELECT * FROM intraday_note WHERE outcome_plan_id = ? ORDER BY sort_order, note_time'
    ).all(outcomePlanId);
  },

  getByCustomPlan(customPlanId) {
    return getDb().prepare(
      'SELECT * FROM intraday_note WHERE custom_plan_id = ? ORDER BY sort_order, note_time'
    ).all(customPlanId);
  },

  getByTradingDay(tradingDayId) {
    return getDb().prepare(
      'SELECT * FROM intraday_note WHERE trading_day_id = ? ORDER BY sort_order, note_time'
    ).all(tradingDayId);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM intraday_note WHERE id = ?').get(id);
  },

  create({ tradingDayId, outcomePlanId, customPlanId, noteTime, action, status }) {
    const result = getDb().prepare(
      'INSERT INTO intraday_note (trading_day_id, outcome_plan_id, custom_plan_id, note_time, action, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(tradingDayId, outcomePlanId || null, customPlanId || null, noteTime, action || '', status || 'Not-Known');
    return this.getById(result.lastInsertRowid);
  },

  update(id, { noteTime, action, status }) {
    getDb().prepare(
      'UPDATE intraday_note SET note_time = ?, action = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(noteTime, action || '', status || 'Not-Known', id);
    return this.getById(id);
  },

  updateAttachment(id, { outcomePlanId, customPlanId }) {
    getDb().prepare(
      'UPDATE intraday_note SET outcome_plan_id = ?, custom_plan_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(outcomePlanId || null, customPlanId || null, id);
    return this.getById(id);
  },

  delete(id) {
    return getDb().prepare('DELETE FROM intraday_note WHERE id = ?').run(id);
  },

  deleteByOutcomePlan(outcomePlanId) {
    return getDb().prepare('DELETE FROM intraday_note WHERE outcome_plan_id = ?').run(outcomePlanId);
  },

  deleteByCustomPlan(customPlanId) {
    return getDb().prepare('DELETE FROM intraday_note WHERE custom_plan_id = ?').run(customPlanId);
  },

  // Returns { outcomePlanCounts: {id: count}, customPlanCounts: {id: count} }
  countByTradingDay(tradingDayId) {
    const outcomePlanCounts = {};
    const customPlanCounts = {};

    const opRows = getDb().prepare(
      `SELECT outcome_plan_id as parentId, COUNT(*) as cnt
       FROM intraday_note
       WHERE trading_day_id = ? AND outcome_plan_id IS NOT NULL
       GROUP BY outcome_plan_id`
    ).all(tradingDayId);
    for (const r of opRows) outcomePlanCounts[r.parentId] = r.cnt;

    const cpRows = getDb().prepare(
      `SELECT custom_plan_id as parentId, COUNT(*) as cnt
       FROM intraday_note
       WHERE trading_day_id = ? AND custom_plan_id IS NOT NULL
       GROUP BY custom_plan_id`
    ).all(tradingDayId);
    for (const r of cpRows) customPlanCounts[r.parentId] = r.cnt;

    return { outcomePlanCounts, customPlanCounts };
  },
};
