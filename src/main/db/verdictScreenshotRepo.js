const { getDb } = require('./database');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

module.exports = {
  getByVerdict(verdictId) {
    return getDb().prepare(
      'SELECT * FROM verdict_screenshot WHERE verdict_id = ? ORDER BY added_at'
    ).all(verdictId);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM verdict_screenshot WHERE id = ?').get(id);
  },

  create({ verdictId, filePath }) {
    const result = getDb().prepare(
      'INSERT INTO verdict_screenshot (verdict_id, file_path) VALUES (?, ?)'
    ).run(verdictId, filePath);
    return this.getById(result.lastInsertRowid);
  },

  delete(id) {
    const ss = this.getById(id);
    if (ss) {
      const fullPath = path.join(app.getPath('userData'), ss.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    return getDb().prepare('DELETE FROM verdict_screenshot WHERE id = ?').run(id);
  },

  deleteByVerdict(verdictId) {
    const screenshots = this.getByVerdict(verdictId);
    for (const ss of screenshots) {
      const fullPath = path.join(app.getPath('userData'), ss.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    return getDb().prepare('DELETE FROM verdict_screenshot WHERE verdict_id = ?').run(verdictId);
  },
};
