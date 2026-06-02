const tradingDayRepo = require('../db/tradingDayRepo');

module.exports = {
  async createTradingDay({ tradeDate, symbolId, notes }) {
    let day = tradingDayRepo.getByDateAndSymbol(tradeDate, symbolId);
    if (!day) {
      day = tradingDayRepo.create({ tradeDate, symbolId, notes });
    }
    return day;
  },
};
