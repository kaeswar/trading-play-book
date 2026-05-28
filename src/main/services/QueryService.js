const tradingDayRepo = require('../db/tradingDayRepo');
const verdictRepo = require('../db/verdictRepo');

module.exports = {
  async getFilteredDays(filters) {
    return tradingDayRepo.getFiltered(filters);
  },

  async getMetrics(symbolId) {
    return verdictRepo.getMetrics(symbolId);
  },
};
