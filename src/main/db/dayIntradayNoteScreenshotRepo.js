const { getDb } = require('./database');

module.exports = {
  getByNote(dayIntradayNoteId) {
    return getDb().prepare(
      'SELECT * FROM day_intraday_note_screenshot WHERE day_intraday_note_id = ? ORDER BY added_at'
    ).all(dayIntradayNoteId);
  },

  create({ dayIntradayNoteId, filePath }) {
    const result = getDb().prepare(
      'INSERT INTO day_intraday_note_screenshot (day_intraday_note_id, file_path) VALUES (?, ?)'
    ).run(dayIntradayNoteId, filePath);
    return getDb().prepare('SELECT * FROM day_intraday_note_screenshot WHERE id = ?').get(result.lastInsertRowid);
  },

  delete(id) {
    return getDb().prepare('DELETE FROM day_intraday_note_screenshot WHERE id = ?').run(id);
  },

  deleteByNote(dayIntradayNoteId) {
    return getDb().prepare('DELETE FROM day_intraday_note_screenshot WHERE day_intraday_note_id = ?').run(dayIntradayNoteId);
  },
};
