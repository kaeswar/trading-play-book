const { getDb } = require('./database');

module.exports = {
  list() {
    return getDb().prepare(`
      SELECT g.*,
        (SELECT COUNT(*) FROM plan_template t WHERE t.group_id = g.id AND t.is_archived = 0) AS template_count
      FROM plan_group g
      ORDER BY g.is_system DESC, g.name COLLATE NOCASE ASC
    `).all();
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM plan_group WHERE id = ?').get(id);
  },

  create({ name, description }) {
    const result = getDb().prepare(
      'INSERT INTO plan_group (name, description, is_system) VALUES (?, ?, 0)'
    ).run(name.trim(), description || null);
    return this.getById(result.lastInsertRowid);
  },

  update(id, { name, description }) {
    const row = this.getById(id);
    if (!row) return null;
    if (row.is_system) throw new Error('System group cannot be modified');
    getDb().prepare(
      'UPDATE plan_group SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(name.trim(), description || null, id);
    return this.getById(id);
  },

  delete(id) {
    const row = this.getById(id);
    if (!row) return { deleted: 0 };
    if (row.is_system) throw new Error('System group cannot be deleted');
    const inUse = getDb().prepare(
      'SELECT COUNT(*) AS c FROM plan_template WHERE group_id = ?'
    ).get(id).c;
    if (inUse > 0) throw new Error(`Group is in use by ${inUse} template(s). Reassign them first.`);
    return getDb().prepare('DELETE FROM plan_group WHERE id = ?').run(id);
  },
};
