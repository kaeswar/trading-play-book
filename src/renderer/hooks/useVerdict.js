import { useState, useCallback } from 'react';

export function useVerdict() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveVerdict = useCallback(async ({ tradingDayId, possibilityCode, outcome, bias, notes }) => {
    setLoading(true);
    setError(null);
    try {
      const existing = await window.api.verdict.getByTradingDay(tradingDayId);

      // Check if plan exists
      const possibilities = await window.api.possibility.getByTradingDay(tradingDayId);
      const matched = possibilities.find((p) => p.code === possibilityCode);
      let hadPlan = false;

      if (matched && matched.has_plan) {
        const outcomePlans = await window.api.outcomePlan.getByPossibility(matched.id);
        hadPlan = outcomePlans.some((op) => op.outcome === outcome);
      }

      const verdictData = { tradingDayId, possibilityCode, outcome, bias, hadPlan, notes };

      let result;
      if (existing) {
        result = await window.api.verdict.update(existing.id, verdictData);
        return { verdict: result, wasUpdate: true, hadPlan };
      } else {
        result = await window.api.verdict.create(verdictData);
        return { verdict: result, wasUpdate: false, hadPlan };
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVerdict = useCallback(async (tradingDayId) => {
    try {
      return await window.api.verdict.getByTradingDay(tradingDayId);
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const getVerdictScreenshots = useCallback(async (verdictId) => {
    try {
      return await window.api.verdictScreenshot.getByVerdict(verdictId);
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  const saveVerdictScreenshots = useCallback(async (verdictId, newScreenshots, existingScreenshots = []) => {
    try {
      // Delete removed screenshots
      const newPaths = new Set(newScreenshots.map((s) => s.file_path));
      for (const existing of existingScreenshots) {
        if (!newPaths.has(existing.file_path)) {
          await window.api.verdictScreenshot.delete(existing.id);
        }
      }
      // Create new screenshots
      for (const ss of newScreenshots) {
        if (ss._isNew) {
          await window.api.verdictScreenshot.create({ verdictId, filePath: ss.file_path });
        }
      }
    } catch (err) {
      setError(err.message);
    }
  }, []);

  return {
    loading,
    error,
    saveVerdict,
    getVerdict,
    getVerdictScreenshots,
    saveVerdictScreenshots,
  };
}
