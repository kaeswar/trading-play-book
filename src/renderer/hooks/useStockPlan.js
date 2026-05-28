import { useState, useCallback } from 'react';

export function useStockPlan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createPlan = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      return await window.api.stockPlan.create(data);
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePlan = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      return await window.api.stockPlan.update(id, data);
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePlan = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      return await window.api.stockPlan.delete(id);
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (id, status) => {
    try {
      return await window.api.stockPlan.updateExecutionStatus(id, status);
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const searchPlans = useCallback(async (filters) => {
    setLoading(true);
    setError(null);
    try {
      return await window.api.stockPlan.search(filters);
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const importChart = useCallback(async (sourcePath, stockName, fileName) => {
    try {
      return await window.api.image.import(sourcePath, stockName, 'stock-plans', fileName);
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  return { loading, error, createPlan, updatePlan, deletePlan, updateStatus, searchPlans, importChart };
}
