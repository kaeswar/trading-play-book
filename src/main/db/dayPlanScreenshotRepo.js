const { getDb } = require('./database');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

module.exports = {
  // kind: 'setup' | 'outcome' | undefined (all)
  getByDayPlan(dayPlanId, kind) {
    if (kind) {
      return getDb().prepare(
        'SELECT * FROM day_plan_screenshot WHERE day_plan_id = ? AND kind = ? ORDER BY added_at'
      ).all(dayPlanId, kind);
    }
    return getDb().prepare(
      'SELECT * FROM day_plan_screenshot WHERE day_plan_id = ? ORDER BY added_at'
    ).all(dayPlanId);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM day_plan_screenshot WHERE id = ?').get(id);
  },

  create({ dayPlanId, kind, filePath }) {
    const resolvedKind = kind || 'setup';
    // Enforce one screenshot per kind — delete existing before inserting.
    const existing = getDb().prepare(
      'SELECT * FROM day_plan_screenshot WHERE day_plan_id = ? AND kind = ?'
    ).all(dayPlanId, resolvedKind);
    for (const ss of existing) {
      const fullPath = path.join(app.getPath('userData'), ss.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      getDb().prepare('DELETE FROM day_plan_screenshot WHERE id = ?').run(ss.id);
    }
    const result = getDb().prepare(
      'INSERT INTO day_plan_screenshot (day_plan_id, kind, file_path) VALUES (?, ?, ?)'
    ).run(dayPlanId, resolvedKind, filePath);
    return this.getById(result.lastInsertRowid);
  },

  delete(id) {
    const ss = this.getById(id);
    if (ss) {
      const fullPath = path.join(app.getPath('userData'), ss.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    return getDb().prepare('DELETE FROM day_plan_screenshot WHERE id = ?').run(id);
  },

  deleteByDayPlan(dayPlanId) {
    const screenshots = this.getByDayPlan(dayPlanId);
    for (const ss of screenshots) {
      const fullPath = path.join(app.getPath('userData'), ss.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    return getDb().prepare('DELETE FROM day_plan_screenshot WHERE day_plan_id = ?').run(dayPlanId);
  },
};
