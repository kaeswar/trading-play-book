const { getDb } = require('./database');

module.exports = {
  getByPossibility(possibilityId) {
    return getDb().prepare(
      'SELECT * FROM outcome_plan WHERE possibility_id = ? ORDER BY id'
    ).all(possibilityId);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM outcome_plan WHERE id = ?').get(id);
  },

  create({ possibilityId, outcome, target, stopOut, description }) {
    const result = getDb().prepare(
      'INSERT INTO outcome_plan (possibility_id, outcome, target, stop_out, description) VALUES (?, ?, ?, ?, ?)'
    ).run(possibilityId, outcome, target ?? null, stopOut ?? null, description ?? null);
    return this.getById(result.lastInsertRowid);
  },

  update(id, { target, stopOut, description }) {
    getDb().prepare(
      'UPDATE outcome_plan SET target = ?, stop_out = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(target ?? null, stopOut ?? null, description ?? null, id);
    return this.getById(id);
  },

  delete(id) {
    return getDb().prepare('DELETE FROM outcome_plan WHERE id = ?').run(id);
  },
};
