import { useState, useCallback } from 'react';

export function useTradingDay() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createOrGetTradingDay = useCallback(async (tradeDate, symbolId, notes) => {
    setLoading(true);
    setError(null);
    try {
      return await window.api.tradingDay.create({ tradeDate, symbolId, notes });
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Returns the trading_day row only — no nested possibilities/verdict anymore.
  // Day plans, screenshots, and notes are loaded via their own hooks.
  const getTradingDayDetails = useCallback(async (tradingDayId) => {
    setLoading(true);
    setError(null);
    try {
      return await window.api.tradingDay.getById(tradingDayId);
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateNotes = useCallback(async (tradingDayId, notes) => {
    try {
      return await window.api.tradingDay.updateNotes(tradingDayId, notes);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  return {
    loading, error,
    createOrGetTradingDay,
    getTradingDayDetails,
    updateNotes,
  };
}
