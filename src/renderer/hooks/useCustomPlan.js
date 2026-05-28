import { useState, useCallback } from 'react';

export function useCustomPlan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCustomPlans = useCallback(async (tradingDayId) => {
    try {
      const plans = await window.api.customPlan.getByTradingDay(tradingDayId);
      const plansWithScreenshots = [];
      for (const plan of plans) {
        const screenshots = await window.api.customPlanScreenshot.getByCustomPlan(plan.id);
        plansWithScreenshots.push({ ...plan, screenshots });
      }
      return plansWithScreenshots;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  const saveCustomPlan = useCallback(async ({ tradingDayId, title, tradePlan, biasTag, target, stopOut }) => {
    try {
      return await window.api.customPlan.create({ tradingDayId, title, tradePlan, biasTag, target, stopOut });
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const updateCustomPlan = useCallback(async (id, { title, tradePlan, biasTag, target, stopOut }) => {
    try {
      return await window.api.customPlan.update(id, { title, tradePlan, biasTag, target, stopOut });
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const saveCustomPlanVerdict = useCallback(async (id, { verdictStatus, verdictNotes }) => {
    try {
      return await window.api.customPlan.updateVerdict(id, { verdictStatus, verdictNotes });
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const deleteCustomPlan = useCallback(async (id) => {
    try {
      return await window.api.customPlan.delete(id);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const addScreenshot = useCallback(async (customPlanId, sourcePath, symbolName, date, fileName) => {
    try {
      const relativePath = await window.api.image.import(sourcePath, symbolName, date, fileName);
      return await window.api.customPlanScreenshot.create({
        customPlanId,
        filePath: relativePath,
      });
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const deleteScreenshot = useCallback(async (screenshotId) => {
    try {
      return await window.api.customPlanScreenshot.delete(screenshotId);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  return {
    loading,
    error,
    getCustomPlans,
    saveCustomPlan,
    updateCustomPlan,
    saveCustomPlanVerdict,
    deleteCustomPlan,
    addScreenshot,
    deleteScreenshot,
  };
}
