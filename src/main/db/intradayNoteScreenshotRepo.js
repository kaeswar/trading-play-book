const { getDb } = require('./database');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

module.exports = {
  getByIntradayNote(intradayNoteId) {
    return getDb().prepare(
      'SELECT * FROM intraday_note_screenshot WHERE intraday_note_id = ? ORDER BY added_at'
    ).all(intradayNoteId);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM intraday_note_screenshot WHERE id = ?').get(id);
  },

  create({ intradayNoteId, filePath }) {
    const result = getDb().prepare(
      'INSERT INTO intraday_note_screenshot (intraday_note_id, file_path) VALUES (?, ?)'
    ).run(intradayNoteId, filePath);
    return this.getById(result.lastInsertRowid);
  },

  delete(id) {
    const ss = this.getById(id);
    if (ss) {
      const fullPath = path.join(app.getPath('userData'), ss.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    return getDb().prepare('DELETE FROM intraday_note_screenshot WHERE id = ?').run(id);
  },

  deleteByIntradayNote(intradayNoteId) {
    const screenshots = this.getByIntradayNote(intradayNoteId);
    for (const ss of screenshots) {
      const fullPath = path.join(app.getPath('userData'), ss.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    return getDb().prepare('DELETE FROM intraday_note_screenshot WHERE intraday_note_id = ?').run(intradayNoteId);
  },
};
