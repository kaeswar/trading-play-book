const { getDb } = require('./database');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

module.exports = {
  // kind: 'setup' | 'outcome' | undefined (all)
  getBySwingPlan(swingPlanId, kind) {
    if (kind) {
      return getDb().prepare(
        'SELECT * FROM swing_plan_screenshot WHERE swing_plan_id = ? AND kind = ? ORDER BY added_at'
      ).all(swingPlanId, kind);
    }
    return getDb().prepare(
      'SELECT * FROM swing_plan_screenshot WHERE swing_plan_id = ? ORDER BY added_at'
    ).all(swingPlanId);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM swing_plan_screenshot WHERE id = ?').get(id);
  },

  create({ swingPlanId, kind, filePath }) {
    const resolvedKind = kind || 'setup';
    // Enforce one screenshot per kind — delete existing before inserting.
    const existing = getDb().prepare(
      'SELECT * FROM swing_plan_screenshot WHERE swing_plan_id = ? AND kind = ?'
    ).all(swingPlanId, resolvedKind);
    for (const ss of existing) {
      const fullPath = path.join(app.getPath('userData'), ss.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      getDb().prepare('DELETE FROM swing_plan_screenshot WHERE id = ?').run(ss.id);
    }
    const result = getDb().prepare(
      'INSERT INTO swing_plan_screenshot (swing_plan_id, kind, file_path) VALUES (?, ?, ?)'
    ).run(swingPlanId, resolvedKind, filePath);
    return this.getById(result.lastInsertRowid);
  },

  delete(id) {
    const ss = this.getById(id);
    if (ss) {
      const fullPath = path.join(app.getPath('userData'), ss.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    return getDb().prepare('DELETE FROM swing_plan_screenshot WHERE id = ?').run(id);
  },

  deleteBySwingPlan(swingPlanId) {
    const screenshots = this.getBySwingPlan(swingPlanId);
    for (const ss of screenshots) {
      const fullPath = path.join(app.getPath('userData'), ss.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    return getDb().prepare('DELETE FROM swing_plan_screenshot WHERE swing_plan_id = ?').run(swingPlanId);
  },
};
