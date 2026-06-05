const { getDb } = require('./database');

module.exports = {
  get(key) {
    const row = getDb().prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
    return row ? row.value : null;
  },

  set(key, value) {
    getDb().prepare(`
      INSERT INTO app_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
  },

  getBrokerConfig() {
    return {
      client_id:    this.get('dhan_client_id')    ?? '',
      access_token: this.get('dhan_access_token') ?? '',
    };
  },

  setBrokerConfig({ client_id, access_token }) {
    this.set('dhan_client_id',    client_id    ?? '');
    this.set('dhan_access_token', access_token ?? '');
  },
};
