import { useState, useCallback } from 'react';

export function useTradingDay() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createOrGetTradingDay = useCallback(async (tradeDate, symbolId, notes) => {
    setLoading(true);
    setError(null);
    try {
      const day = await window.api.tradingDay.create({ tradeDate, symbolId, notes });
      return day;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTradingDayDetails = useCallback(async (tradingDayId) => {
    setLoading(true);
    setError(null);
    try {
      const day = await window.api.tradingDay.getById(tradingDayId);
      if (!day) return null;

      const possibilities = await window.api.possibility.getByTradingDay(tradingDayId);
      const possibilitiesWithOutcomes = [];

      for (const p of possibilities) {
        const outcomePlans = await window.api.outcomePlan.getByPossibility(p.id);
        const outcomesWithScreenshots = [];

        for (const op of outcomePlans) {
          const screenshots = await window.api.screenshot.getByOutcomePlan(op.id);
          outcomesWithScreenshots.push({ ...op, screenshots });
        }

        possibilitiesWithOutcomes.push({
          ...p,
          outcomePlans: outcomesWithScreenshots,
        });
      }

      const verdict = await window.api.verdict.getByTradingDay(tradingDayId);

      return {
        ...day,
        possibilities: possibilitiesWithOutcomes,
        verdict,
      };
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveOutcomePlan = useCallback(async (possibilityId, outcome, target, stopOut, description) => {
    try {
      // Check if plan exists
      const existing = await window.api.outcomePlan.getByPossibility(possibilityId);
      const matched = existing.find((op) => op.outcome === outcome);

      let result;
      if (matched) {
        result = await window.api.outcomePlan.update(matched.id, { target, stopOut, description });
      } else {
        result = await window.api.outcomePlan.create({ possibilityId, outcome, target, stopOut, description });
      }

      // Mark possibility as planned
      await window.api.possibility.updateHasPlan(possibilityId, true);

      return result;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const deleteOutcomePlan = useCallback(async (outcomePlanId) => {
    try {
      return await window.api.outcomePlan.delete(outcomePlanId);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const addScreenshot = useCallback(async (sourcePath, symbolName, date, fileName, outcomePlanId, label) => {
    try {
      const relativePath = await window.api.image.import(sourcePath, symbolName, date, fileName);
      return await window.api.screenshot.create({
        outcomePlanId,
        filePath: relativePath,
        label,
      });
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const deleteScreenshot = useCallback(async (screenshotId) => {
    try {
      return await window.api.screenshot.delete(screenshotId);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const markNoPlan = useCallback(async (possibilityId) => {
    try {
      return await window.api.possibility.updateHasPlan(possibilityId, false);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const markHasPlan = useCallback(async (possibilityId) => {
    try {
      return await window.api.possibility.updateHasPlan(possibilityId, true);
    } catch (err) {
      setError(err.message);
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
    loading,
    error,
    createOrGetTradingDay,
    getTradingDayDetails,
    saveOutcomePlan,
    deleteOutcomePlan,
    addScreenshot,
    deleteScreenshot,
    markNoPlan,
    markHasPlan,
    updateNotes,
  };
}
