import { useState, useCallback } from 'react';

export function useIntradayNotes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getByDayPlan = useCallback(async (dayPlanId) => {
    try {
      setLoading(true);
      const notes = await window.api.intradayNote.getByDayPlan(dayPlanId);
      const enriched = [];
      for (const note of notes) {
        const screenshots = await window.api.intradayNoteScreenshot.getByIntradayNote(note.id);
        enriched.push({ ...note, screenshots });
      }
      return enriched;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createNote = useCallback(async ({ tradingDayId, dayPlanId, noteTime, action, status }) => {
    try {
      return await window.api.intradayNote.create({
        tradingDayId,
        dayPlanId,
        noteTime,
        action,
        status,
      });
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const updateNote = useCallback(async (id, { noteTime, action, status }) => {
    try {
      return await window.api.intradayNote.update(id, { noteTime, action, status });
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const deleteNote = useCallback(async (id) => {
    try {
      return await window.api.intradayNote.delete(id);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const addScreenshot = useCallback(async (intradayNoteId, sourcePath, symbolName, date, fileName) => {
    try {
      const relativePath = await window.api.image.import(sourcePath, symbolName, date, fileName);
      return await window.api.intradayNoteScreenshot.create({
        intradayNoteId,
        filePath: relativePath,
      });
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const addScreenshotFromBuffer = useCallback(async (intradayNoteId, uint8Array, symbolName, date, fileName) => {
    try {
      const relativePath = await window.api.image.saveBuffer(uint8Array, symbolName, date, fileName);
      return await window.api.intradayNoteScreenshot.create({
        intradayNoteId,
        filePath: relativePath,
      });
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const deleteScreenshot = useCallback(async (screenshotId) => {
    try {
      return await window.api.intradayNoteScreenshot.delete(screenshotId);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  return {
    loading,
    error,
    getByDayPlan,
    createNote,
    updateNote,
    deleteNote,
    addScreenshot,
    addScreenshotFromBuffer,
    deleteScreenshot,
  };
}
