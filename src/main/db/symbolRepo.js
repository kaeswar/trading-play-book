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

  rename(id, name) {
    const db = getDb();
    const current = db.prepare('SELECT name FROM symbol WHERE id = ?').get(id);
    if (current) {
      db.prepare('UPDATE sessions SET instrument = ? WHERE instrument = ?').run(name, current.name);
    }
    db.prepare('UPDATE symbol SET name = ? WHERE id = ?').run(name, id);
    return this.getById(id);
  },

  getByName(name) {
    return getDb().prepare('SELECT * FROM symbol WHERE name = ?').get(name);
  },

  updateDhanConfig(id, { dhan_security_id, dhan_exchange_segment, dhan_instrument_type }) {
    getDb().prepare(`UPDATE symbol SET dhan_security_id=?, dhan_exchange_segment=?, dhan_instrument_type=? WHERE id=?`)
      .run(dhan_security_id ?? null, dhan_exchange_segment ?? null, dhan_instrument_type ?? null, id);
    return this.getById(id);
  },
};
