const { getDb } = require('./database');

module.exports = {
  getByTradingDay(tradingDayId) {
    return getDb().prepare(
      'SELECT * FROM possibility WHERE trading_day_id = ? ORDER BY id'
    ).all(tradingDayId);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM possibility WHERE id = ?').get(id);
  },

  create({ tradingDayId, code, bias, hasPlan = 0 }) {
    const result = getDb().prepare(
      'INSERT INTO possibility (trading_day_id, code, bias, has_plan) VALUES (?, ?, ?, ?)'
    ).run(tradingDayId, code, bias, hasPlan);
    return this.getById(result.lastInsertRowid);
  },

  updateHasPlan(id, hasPlan) {
    getDb().prepare('UPDATE possibility SET has_plan = ? WHERE id = ?').run(hasPlan ? 1 : 0, id);
    return this.getById(id);
  },
};
