const { getDb } = require('./database');

module.exports = {
  getAll() {
    return getDb().prepare('SELECT * FROM symbol ORDER BY name').all();
  },

  getActive() {
    return getDb().prepare('SELECT * FROM symbol WHERE is_active = 1 ORDER BY name').all();
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM symbol WHERE id = ?').get(id);
  },

  create(name) {
    const result = getDb().prepare('INSERT INTO symbol (name) VALUES (?)').run(name);
    return this.getById(result.lastInsertRowid);
  },

  setInactive(id) {
    return getDb().prepare('UPDATE symbol SET is_active = 0 WHERE id = ?').run(id);
  },
};
