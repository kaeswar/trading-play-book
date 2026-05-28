const verdictRepo = require('../db/verdictRepo');
const possibilityRepo = require('../db/possibilityRepo');
const outcomePlanRepo = require('../db/outcomePlanRepo');

module.exports = {
  async saveVerdict({ tradingDayId, possibilityCode, outcome, bias, notes }) {
    // Check if plan exists for this possibility + outcome
    const possibilities = possibilityRepo.getByTradingDay(tradingDayId);
    const matchedPossibility = possibilities.find((p) => p.code === possibilityCode);

    let hadPlan = false;
    if (matchedPossibility && matchedPossibility.has_plan) {
      const outcomePlans = outcomePlanRepo.getByPossibility(matchedPossibility.id);
      hadPlan = outcomePlans.some((op) => op.outcome === outcome);
    }

    const existing = verdictRepo.getByTradingDay(tradingDayId);
    const verdictData = {
      tradingDayId,
      possibilityCode,
      outcome,
      bias,
      hadPlan,
      notes,
    };

    if (existing) {
      return { verdict: verdictRepo.update(existing.id, verdictData), wasUpdate: true, hadPlan };
    } else {
      return { verdict: verdictRepo.create(verdictData), wasUpdate: false, hadPlan };
    }
  },

  async getVerdict(tradingDayId) {
    return verdictRepo.getByTradingDay(tradingDayId);
  },
};
