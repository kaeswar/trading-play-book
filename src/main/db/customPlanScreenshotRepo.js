const { getDb } = require('./database');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

module.exports = {
  getByCustomPlan(customPlanId) {
    return getDb().prepare(
      'SELECT * FROM custom_plan_screenshot WHERE custom_plan_id = ? ORDER BY added_at'
    ).all(customPlanId);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM custom_plan_screenshot WHERE id = ?').get(id);
  },

  create({ customPlanId, filePath }) {
    const result = getDb().prepare(
      'INSERT INTO custom_plan_screenshot (custom_plan_id, file_path) VALUES (?, ?)'
    ).run(customPlanId, filePath);
    return this.getById(result.lastInsertRowid);
  },

  delete(id) {
    const ss = this.getById(id);
    if (ss) {
      const fullPath = path.join(app.getPath('userData'), ss.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    return getDb().prepare('DELETE FROM custom_plan_screenshot WHERE id = ?').run(id);
  },

  deleteByCustomPlan(customPlanId) {
    const screenshots = this.getByCustomPlan(customPlanId);
    for (const ss of screenshots) {
      const fullPath = path.join(app.getPath('userData'), ss.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    return getDb().prepare('DELETE FROM custom_plan_screenshot WHERE custom_plan_id = ?').run(customPlanId);
  },
};
