const tradingDayRepo = require('../db/tradingDayRepo');
const possibilityRepo = require('../db/possibilityRepo');
const outcomePlanRepo = require('../db/outcomePlanRepo');
const screenshotRepo = require('../db/screenshotRepo');

const POSSIBILITIES = [
  { code: 'Open_Abv_PDR', bias: 'Bullish' },
  { code: 'Open_Abv_VAH_IR', bias: 'Bullish' },
  { code: 'Open_Abv_POC_IV', bias: 'Bullish' },
  { code: 'Open_Bel_POC_IV', bias: 'Bearish' },
  { code: 'Open_Bel_VAL_IR', bias: 'Bearish' },
  { code: 'Open_Bel_PDR', bias: 'Bearish' },
];

module.exports = {
  async createTradingDay({ tradeDate, symbolId, notes }) {
    // Create or get existing trading day
    let day = tradingDayRepo.getByDateAndSymbol(tradeDate, symbolId);
    if (!day) {
      day = tradingDayRepo.create({ tradeDate, symbolId, notes });

      // Always create 6 possibilities
      for (const p of POSSIBILITIES) {
        possibilityRepo.create({
          tradingDayId: day.id,
          code: p.code,
          bias: p.bias,
        });
      }
    }
    return day;
  },

  async getTradingDayWithDetails(tradingDayId) {
    const day = tradingDayRepo.getById(tradingDayId);
    if (!day) return null;

    const possibilities = possibilityRepo.getByTradingDay(tradingDayId);
    const possibilitiesWithOutcomes = [];

    for (const p of possibilities) {
      const outcomePlans = outcomePlanRepo.getByPossibility(p.id);
      const outcomesWithScreenshots = [];

      for (const op of outcomePlans) {
        const screenshots = screenshotRepo.getByOutcomePlan(op.id);
        outcomesWithScreenshots.push({ ...op, screenshots });
      }

      possibilitiesWithOutcomes.push({
        ...p,
        outcomePlans: outcomesWithScreenshots,
      });
    }

    return {
      ...day,
      possibilities: possibilitiesWithOutcomes,
    };
  },

  async saveOutcomePlan({ possibilityId, outcome, target, stopOut }) {
    // Check if outcome plan already exists
    const existing = outcomePlanRepo.getByPossibility(possibilityId).find(
      (op) => op.outcome === outcome
    );

    if (existing) {
      return outcomePlanRepo.update(existing.id, { target, stopOut });
    } else {
      return outcomePlanRepo.create({ possibilityId, outcome, target, stopOut });
    }
  },

  async markPossibilityAsPlanned(possibilityId) {
    return possibilityRepo.updateHasPlan(possibilityId, true);
  },

  async markPossibilityAsNoPlan(possibilityId) {
    return possibilityRepo.updateHasPlan(possibilityId, false);
  },
};
