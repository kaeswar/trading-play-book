import { useCallback } from 'react';

export function useSwingPlan() {
  const search = useCallback(async (filters = {}) => {
    return window.api.swingPlan.search(filters);
  }, []);

  const getById = useCallback(async (id) => {
    return window.api.swingPlan.get(id);
  }, []);

  const createFromTemplate = useCallback(async (payload) => {
    const res = await window.api.swingPlan.createFromTemplate(payload);
    if (!res.success) throw new Error(res.error || 'Failed to create swing plan');
    return res.swingPlan;
  }, []);

  const updateNumbers = useCallback(async (id, payload) => {
    const res = await window.api.swingPlan.updateNumbers(id, payload);
    if (!res.success) throw new Error(res.error || 'Failed to update');
    return res.swingPlan;
  }, []);

  const updateExecution = useCallback(async (id, payload) => {
    const res = await window.api.swingPlan.updateExecution(id, payload);
    if (!res.success) throw new Error(res.error || 'Failed to update execution');
    return res.swingPlan;
  }, []);

  const deletePlan = useCallback(async (id) => {
    const res = await window.api.swingPlan.delete(id);
    if (!res.success) throw new Error(res.error || 'Failed to delete');
    return true;
  }, []);

  // ── Screenshots ──
  const getScreenshots = useCallback(async (swingPlanId, kind) => {
    return window.api.swingPlanScreenshot.getBySwingPlan(swingPlanId, kind);
  }, []);

  const addScreenshot = useCallback(async (swingPlanId, sourcePath, symbolName, date, fileName, kind = 'setup') => {
    const relativePath = await window.api.image.import(sourcePath, symbolName, date, fileName);
    return window.api.swingPlanScreenshot.create({ swingPlanId, kind, filePath: relativePath });
  }, []);

  const addScreenshotFromBuffer = useCallback(async (swingPlanId, uint8Array, symbolName, date, fileName, kind = 'setup') => {
    const relativePath = await window.api.image.saveBuffer(uint8Array, symbolName, date, fileName);
    return window.api.swingPlanScreenshot.create({ swingPlanId, kind, filePath: relativePath });
  }, []);

  const deleteScreenshot = useCallback(async (id) => {
    return window.api.swingPlanScreenshot.delete(id);
  }, []);

  return {
    search,
    getById,
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
