import { useCallback } from 'react';

export function useDayPlan() {
  const getByTradingDay = useCallback(async (tradingDayId) => {
    if (!tradingDayId) return [];
    return window.api.dayPlan.getByTradingDay(tradingDayId);
  }, []);

  const createFromTemplate = useCallback(async ({ tradingDayId, templateId, sortOrder = 0 }) => {
    const res = await window.api.dayPlan.createFromTemplate({ tradingDayId, templateId, sortOrder });
    if (!res.success) throw new Error(res.error || 'Failed to create day plan');
    return res.dayPlan;
  }, []);

  const updateNumbers = useCallback(async (id, payload) => {
    const res = await window.api.dayPlan.updateNumbers(id, payload);
    if (!res.success) throw new Error(res.error || 'Failed to update');
    return res.dayPlan;
  }, []);

  const updateExecution = useCallback(async (id, payload) => {
    const res = await window.api.dayPlan.updateExecution(id, payload);
    if (!res.success) throw new Error(res.error || 'Failed to update execution');
    return res.dayPlan;
  }, []);

  const deletePlan = useCallback(async (id) => {
    const res = await window.api.dayPlan.delete(id);
    if (!res.success) throw new Error(res.error || 'Failed to delete');
    return true;
  }, []);

  const getScreenshots = useCallback(async (dayPlanId, kind) => {
    return window.api.dayPlanScreenshot.getByDayPlan(dayPlanId, kind);
  }, []);

  const addScreenshot = useCallback(async (dayPlanId, sourcePath, symbolName, date, fileName, kind = 'setup') => {
    const relativePath = await window.api.image.import(sourcePath, symbolName, date, fileName);
    return window.api.dayPlanScreenshot.create({ dayPlanId, kind, filePath: relativePath });
  }, []);

  const addScreenshotFromBuffer = useCallback(async (dayPlanId, uint8Array, symbolName, date, fileName, kind = 'setup') => {
    const relativePath = await window.api.image.saveBuffer(uint8Array, symbolName, date, fileName);
    return window.api.dayPlanScreenshot.create({ dayPlanId, kind, filePath: relativePath });
  }, []);

  const deleteScreenshot = useCallback(async (id) => {
    return window.api.dayPlanScreenshot.delete(id);
  }, []);

  return {
    getByTradingDay,
    createFromTemplate,
    updateNumbers,
    updateExecution,
    deletePlan,
    getScreenshots,
    addScreenshot,
    addScreenshotFromBuffer,
    deleteScreenshot,
  };
}
