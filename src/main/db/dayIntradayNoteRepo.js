const { getDb } = require('./database');

module.exports = {
  getByTradingDay(tradingDayId) {
    return getDb().prepare(
      'SELECT * FROM day_intraday_note WHERE trading_day_id = ? ORDER BY sort_order, note_time'
    ).all(tradingDayId);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM day_intraday_note WHERE id = ?').get(id);
  },

  create({ tradingDayId, noteTime, action, status }) {
    const result = getDb().prepare(
      'INSERT INTO day_intraday_note (trading_day_id, note_time, action, status) VALUES (?, ?, ?, ?)'
    ).run(tradingDayId, noteTime, action || '', status || 'Not-Known');
    return this.getById(result.lastInsertRowid);
  },

  update(id, { noteTime, action, status }) {
    getDb().prepare(
      'UPDATE day_intraday_note SET note_time = ?, action = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(noteTime, action || '', status || 'Not-Known', id);
    return this.getById(id);
  },

  delete(id) {
    return getDb().prepare('DELETE FROM day_intraday_note WHERE id = ?').run(id);
  },

  count(tradingDayId) {
    const row = getDb().prepare(
      'SELECT COUNT(*) AS cnt FROM day_intraday_note WHERE trading_day_id = ?'
    ).get(tradingDayId);
    return row?.cnt || 0;
  },
};
