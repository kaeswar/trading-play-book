const { getDb } = require('./database');

module.exports = {
  getByTradingDay(tradingDayId) {
    return getDb().prepare(
      'SELECT * FROM verdict WHERE trading_day_id = ?'
    ).get(tradingDayId);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM verdict WHERE id = ?').get(id);
  },

  create({ tradingDayId, possibilityCode, outcome, bias, hadPlan, notes }) {
    const result = getDb().prepare(
      `INSERT INTO verdict (trading_day_id, possibility_code, outcome, bias, had_plan, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(tradingDayId, possibilityCode, outcome, bias, hadPlan ? 1 : 0, notes || null);
    return this.getById(result.lastInsertRowid);
  },

  update(id, { possibilityCode, outcome, bias, hadPlan, notes }) {
    getDb().prepare(
      `UPDATE verdict SET possibility_code = ?, outcome = ?, bias = ?, had_plan = ?,
       notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(possibilityCode, outcome, bias, hadPlan ? 1 : 0, notes || null, id);
    return this.getById(id);
  },

  getMetrics(symbolId) {
    const db = getDb();

    let baseWhere = '';
    const params = [];
    if (symbolId) {
      baseWhere = ' AND td.symbol_id = ?';
      params.push(symbolId);
    }

    // Total verdict days
    const totalDays = db.prepare(
      `SELECT COUNT(*) as count FROM verdict v
       JOIN trading_day td ON v.trading_day_id = td.id
       WHERE 1=1 ${baseWhere}`
    ).get(...params).count;

    // Preparation rate
    const preparedDays = db.prepare(
      `SELECT COUNT(*) as count FROM verdict v
       JOIN trading_day td ON v.trading_day_id = td.id
       WHERE v.had_plan = 1 ${baseWhere}`
    ).get(...params).count;

    // Most planned possibility
    const mostPlanned = db.prepare(
      `SELECT p.code, COUNT(*) as count FROM possibility p
       JOIN trading_day td ON p.trading_day_id = td.id
       WHERE p.has_plan = 1 ${baseWhere}
       GROUP BY p.code ORDER BY count DESC LIMIT 1`
    ).get(...params);

    // Most occurring possibility (from verdicts)
    const mostOccurred = db.prepare(
      `SELECT v.possibility_code as code, COUNT(*) as count FROM verdict v
       JOIN trading_day td ON v.trading_day_id = td.id
       WHERE 1=1 ${baseWhere}
       GROUP BY v.possibility_code ORDER BY count DESC LIMIT 1`
    ).get(...params);

    // Plan vs verdict match rate
    const matchCount = db.prepare(
      `SELECT COUNT(*) as count FROM verdict v
       JOIN trading_day td ON v.trading_day_id = td.id
       JOIN possibility p ON p.trading_day_id = td.id AND p.code = v.possibility_code
       JOIN outcome_plan op ON op.possibility_id = p.id AND op.outcome = v.outcome
       WHERE 1=1 ${baseWhere}`
    ).get(...params).count;

    // Outcome distribution
    const outcomeDistribution = db.prepare(
      `SELECT v.outcome, COUNT(*) as count FROM verdict v
       JOIN trading_day td ON v.trading_day_id = td.id
       WHERE 1=1 ${baseWhere}
       GROUP BY v.outcome`
    ).all(...params);

    // Bias distribution
    const biasDistribution = db.prepare(
      `SELECT v.bias, COUNT(*) as count FROM verdict v
       JOIN trading_day td ON v.trading_day_id = td.id
       WHERE 1=1 ${baseWhere}
       GROUP BY v.bias`
    ).all(...params);

    return {
      totalDays,
      preparedDays,
      preparationRate: totalDays > 0 ? Math.round((preparedDays / totalDays) * 100) : 0,
      mostPlannedPossibility: mostPlanned || { code: 'N/A', count: 0 },
      mostOccurredPossibility: mostOccurred || { code: 'N/A', count: 0 },
      planMatchRate: totalDays > 0 ? Math.round((matchCount / totalDays) * 100) : 0,
      outcomeDistribution,
      biasDistribution,
    };
  },
};
