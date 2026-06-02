const { getDb } = require('./database');

function castRow(row) {
  if (!row) return null;
  return {
    ...row,
    is_system: !!row.is_system,
    is_archived: !!row.is_archived,
  };
}

module.exports = {
  // Filters: { tradeType, groupId, biases | bias, search, includeArchived }
  list(filters = {}) {
    const where = [];
    const params = [];

    if (!filters.includeArchived) where.push('t.is_archived = 0');

    if (filters.tradeType) {
      if (filters.tradeType === 'Intraday' || filters.tradeType === 'Swing') {
        where.push("(t.trade_type = ? OR t.trade_type = 'Both')");
        params.push(filters.tradeType);
      } else {
        where.push('t.trade_type = ?');
        params.push(filters.tradeType);
      }
    }

    if (filters.groupId === 'uncategorized') {
      where.push('t.group_id IS NULL');
    } else if (typeof filters.groupId === 'number') {
      where.push('t.group_id = ?');
      params.push(filters.groupId);
    }

    // Bias filter — supports array (filters.biases) or single (filters.bias).
    const biasList = Array.isArray(filters.biases) && filters.biases.length > 0
      ? filters.biases
      : (filters.bias ? [filters.bias] : []);
    if (biasList.length > 0) {
      const placeholders = biasList.map(() => '?').join(',');
      where.push(`t.bias IN (${placeholders})`);
      params.push(...biasList);
    }

    if (filters.search) {
      where.push('(t.name LIKE ? OR t.description LIKE ? OR t.tags LIKE ?)');
      const like = `%${filters.search}%`;
      params.push(like, like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = getDb().prepare(`
      SELECT t.*, g.name AS group_name
      FROM plan_template t
      LEFT JOIN plan_group g ON t.group_id = g.id
      ${whereSql}
      ORDER BY t.is_system DESC, t.usage_count DESC, t.name COLLATE NOCASE ASC
    `).all(...params);
    return rows.map(castRow);
  },

  getById(id) {
    const row = getDb().prepare(`
      SELECT t.*, g.name AS group_name
      FROM plan_template t
      LEFT JOIN plan_group g ON t.group_id = g.id
      WHERE t.id = ?
    `).get(id);
    return castRow(row);
  },

  create(payload) {
    const {
      tradeType, groupId, name, description,
      bias, behaviorTag,
      positionSizingNote, tags,
    } = payload;
    const result = getDb().prepare(`
      INSERT INTO plan_template
        (trade_type, group_id, name, description, bias, behavior_tag,
         position_sizing_note, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tradeType,
      groupId || null,
      name.trim(),
      description || null,
      bias,
      behaviorTag || null,
      positionSizingNote || null,
      tags || null,
    );
    return this.getById(result.lastInsertRowid);
  },

  update(id, payload) {
    const existing = this.getById(id);
    if (!existing) return null;
    if (existing.is_system) throw new Error('System template cannot be modified. Clone it first.');
    const {
      tradeType, groupId, name, description,
      bias, behaviorTag,
      positionSizingNote, tags,
    } = payload;
    getDb().prepare(`
      UPDATE plan_template SET
        trade_type = ?, group_id = ?, name = ?, description = ?,
        bias = ?, behavior_tag = ?,
        position_sizing_note = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      tradeType,
      groupId || null,
      name.trim(),
      description || null,
      bias,
      behaviorTag || null,
      positionSizingNote || null,
      tags || null,
      id,
    );
    return this.getById(id);
  },

  archive(id, archived) {
    const row = this.getById(id);
    if (!row) return null;
    if (row.is_system) throw new Error('System template cannot be archived.');
    getDb().prepare(
      'UPDATE plan_template SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(archived ? 1 : 0, id);
    return this.getById(id);
  },

  delete(id) {
    const row = this.getById(id);
    if (!row) return { deleted: 0 };
    if (row.is_system) throw new Error('System template cannot be deleted. Archive instead.');
    return getDb().prepare('DELETE FROM plan_template WHERE id = ?').run(id);
  },

  clone(id, overrideName) {
    const src = this.getById(id);
    if (!src) return null;
    return this.create({
      tradeType: src.trade_type,
      groupId: src.group_id,
      name: overrideName || `${src.name} (Copy)`,
      description: src.description,
      bias: src.bias,
      behaviorTag: src.behavior_tag,
      positionSizingNote: src.position_sizing_note,
      tags: src.tags,
    });
  },

  incrementUsage(id) {
    getDb().prepare(
      'UPDATE plan_template SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(id);
    return this.getById(id);
  },
};
