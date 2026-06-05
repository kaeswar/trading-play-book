const { getDb } = require('./database');

// Full NSE session TPO schedule (09:15 – 15:30 IST, 30-min blocks)
const TPO_SCHEDULE = [
  { row_type: 'pre_session', tpo_label: 'P',  time_from: '09:00', time_to: null,    sort_order: 1  },
  { row_type: 'opening',     tpo_label: 'O',  time_from: '09:15', time_to: null,    sort_order: 2  },
  { row_type: 'tpo_a',       tpo_label: 'A',  time_from: '09:15', time_to: '09:45', sort_order: 3  },
  { row_type: 'ib_complete', tpo_label: 'IB', time_from: '09:45', time_to: '10:15', sort_order: 4  },
  { row_type: 'tpo', tpo_label: 'C', time_from: '10:15', time_to: '10:45', sort_order: 5  },
  { row_type: 'tpo', tpo_label: 'D', time_from: '10:45', time_to: '11:15', sort_order: 6  },
  { row_type: 'tpo', tpo_label: 'E', time_from: '11:15', time_to: '11:45', sort_order: 7  },
  { row_type: 'tpo', tpo_label: 'F', time_from: '11:45', time_to: '12:15', sort_order: 8  },
  { row_type: 'tpo', tpo_label: 'G', time_from: '12:15', time_to: '12:45', sort_order: 9  },
  { row_type: 'tpo', tpo_label: 'H', time_from: '12:45', time_to: '13:15', sort_order: 10 },
  { row_type: 'tpo', tpo_label: 'I', time_from: '13:15', time_to: '13:45', sort_order: 11 },
  { row_type: 'tpo', tpo_label: 'J', time_from: '13:45', time_to: '14:15', sort_order: 12 },
  { row_type: 'tpo', tpo_label: 'K', time_from: '14:15', time_to: '14:45', sort_order: 13 },
  { row_type: 'tpo', tpo_label: 'L', time_from: '14:45', time_to: '15:15', sort_order: 14 },
  { row_type: 'tpo', tpo_label: 'M', time_from: '15:15', time_to: '15:30', sort_order: 15 },
];

function parseEntries(entries) {
  return entries.map(e => ({
    ...e,
    otf_symptoms: e.otf_symptoms ? (() => { try { return JSON.parse(e.otf_symptoms); } catch { return []; } })() : [],
  }));
}

function renormalise(db, sessionId) {
  const rows = db.prepare(
    'SELECT id FROM journal_entries WHERE session_id = ? ORDER BY sort_order, id'
  ).all(sessionId);
  const upd = db.prepare('UPDATE journal_entries SET sort_order = ? WHERE id = ?');
  rows.forEach((r, i) => upd.run(i + 1, r.id));
}

module.exports = {
  createSession({ sessionDate, instrument = 'NIFTY50-FUT' }) {
    const db = getDb();
    const sess = db.prepare(
      `INSERT INTO sessions (session_date, instrument, created_at) VALUES (?, ?, datetime('now'))`
    ).run(sessionDate, instrument);
    const sessionId = sess.lastInsertRowid;

    const ins = db.prepare(`
      INSERT INTO journal_entries
        (session_id, row_type, tpo_label, time_from, time_to, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    for (const s of TPO_SCHEDULE) ins.run(sessionId, s.row_type, s.tpo_label, s.time_from, s.time_to, s.sort_order);

    return this.getSession(sessionId);
  },

  getSessions() {
    return getDb().prepare('SELECT * FROM sessions ORDER BY session_date DESC').all();
  },

  getSession(id) {
    const db = getDb();
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!session) return null;
    const entries = parseEntries(
      db.prepare('SELECT * FROM journal_entries WHERE session_id = ? ORDER BY sort_order').all(id)
    );

    return { ...session, entries };
  },

  saveEntry(id, data) {
    const db = getDb();
    const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id);
    if (!entry) throw new Error('Entry not found: ' + id);

    // Compute period_range
    const ph = data.period_high != null ? parseFloat(data.period_high) : null;
    const pl = data.period_low  != null ? parseFloat(data.period_low)  : null;
    const period_range = (ph != null && pl != null) ? parseFloat((ph - pl).toFixed(4)) : null;

    const otf_symptoms = data.otf_symptoms != null
      ? JSON.stringify(Array.isArray(data.otf_symptoms) ? data.otf_symptoms : [])
      : null;

    db.prepare(`
      UPDATE journal_entries SET
        period_high             = ?,
        period_low              = ?,
        period_close            = ?,
        period_range            = ?,
        location_vs_prev_va     = ?,
        location_vs_a_footprint = ?,
        extension_direction     = ?,
        otf_symptoms            = ?,
        va_migration_poc        = ?,
        va_migration_width      = ?,
        observation             = ?,
        bias                    = ?,
        bias_trigger            = ?,
        open_question           = ?,
        structure_event_type    = ?,
        price_reference         = ?,
        acceptance              = ?,
        updated_at              = datetime('now')
      WHERE id = ?
    `).run(
      ph, pl,
      data.period_close != null ? parseFloat(data.period_close) : null,
      period_range,
      data.location_vs_prev_va    ?? null,
      data.location_vs_a_footprint ?? null,
      data.extension_direction    ?? null,
      otf_symptoms,
      data.va_migration_poc       ?? null,
      data.va_migration_width     ?? null,
      data.observation            ?? null,
      data.bias                   ?? null,
      data.bias_trigger           ?? null,
      data.open_question          ?? null,
      data.structure_event_type   ?? null,
      data.price_reference != null ? parseFloat(data.price_reference) : null,
      data.acceptance             ?? null,
      id
    );

    // Propagate session-level fields based on row_type
    if (entry.row_type === 'pre_session') {
      db.prepare(`UPDATE sessions SET prev_vah=?, prev_poc=?, prev_val=?, prev_session_type=? WHERE id=?`)
        .run(data.prev_vah ?? null, data.prev_poc ?? null, data.prev_val ?? null, data.prev_session_type ?? null, entry.session_id);
    }

    if (entry.row_type === 'opening') {
      db.prepare(`UPDATE sessions SET opening_price=?, gap_type=? WHERE id=?`)
        .run(data.opening_price != null ? parseFloat(data.opening_price) : null, data.gap_type ?? null, entry.session_id);
    }

    if (entry.row_type === 'tpo_a') {
      db.prepare(`UPDATE sessions SET a_vah=?, a_poc=?, a_val=? WHERE id=?`)
        .run(data.a_vah != null ? parseFloat(data.a_vah) : null,
             data.a_poc != null ? parseFloat(data.a_poc) : null,
             data.a_val != null ? parseFloat(data.a_val) : null,
             entry.session_id);
    }

    if (entry.row_type === 'ib_complete') {
      const ib_h = ph, ib_l = pl;
      const ib_range = (ib_h != null && ib_l != null) ? parseFloat((ib_h - ib_l).toFixed(4)) : null;
      db.prepare(`UPDATE sessions SET ib_high=?, ib_low=?, ib_range=? WHERE id=?`)
        .run(ib_h, ib_l, ib_range, entry.session_id);
    }

    return this.getSession(entry.session_id);
  },

  insertStructureEvent(sessionId, afterSortOrder) {
    const db = getDb();
    db.prepare(`
      INSERT INTO journal_entries
        (session_id, row_type, tpo_label, sort_order, created_at, updated_at)
      VALUES (?, 'structure_event', '!', ?, datetime('now'), datetime('now'))
    `).run(sessionId, afterSortOrder + 0.5);
    renormalise(db, sessionId);
    return this.getSession(sessionId);
  },

  deleteEntry(id) {
    const db = getDb();
    const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id);
    if (!entry) throw new Error('Entry not found: ' + id);
    if (entry.row_type !== 'structure_event') throw new Error('Only structure_event rows can be deleted');
    db.prepare('DELETE FROM journal_entries WHERE id = ?').run(id);
    renormalise(db, entry.session_id);
    return this.getSession(entry.session_id);
  },

  deleteSession(id) {
    const db = getDb();
    db.prepare('DELETE FROM journal_entries WHERE session_id = ?').run(id);
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  },
};
