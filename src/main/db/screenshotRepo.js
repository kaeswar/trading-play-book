const { getDb } = require('./database');

module.exports = {
  getByOutcomePlan(outcomePlanId) {
    return getDb().prepare(
      'SELECT * FROM screenshot WHERE outcome_plan_id = ? ORDER BY added_at'
    ).all(outcomePlanId);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM screenshot WHERE id = ?').get(id);
  },

  create({ outcomePlanId, filePath, label }) {
    const result = getDb().prepare(
      'INSERT INTO screenshot (outcome_plan_id, file_path, label) VALUES (?, ?, ?)'
    ).run(outcomePlanId, filePath, label || null);
    return this.getById(result.lastInsertRowid);
  },

  delete(id) {
    return getDb().prepare('DELETE FROM screenshot WHERE id = ?').run(id);
  },
};
