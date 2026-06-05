import { useState, useCallback } from 'react';

export function useDayIntradayNotes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getByTradingDay = useCallback(async (tradingDayId) => {
    try {
      setLoading(true);
      const notes = await window.api.dayIntradayNote.getByTradingDay(tradingDayId);
      const enriched = [];
      for (const note of notes) {
        const screenshots = await window.api.dayIntradayNoteScreenshot.getByNote(note.id);
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

  const createNote = useCallback(async ({ tradingDayId, noteTime, action, status }) => {
    try {
      return await window.api.dayIntradayNote.create({ tradingDayId, noteTime, action, status });
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const updateNote = useCallback(async (id, { noteTime, action, status }) => {
    try {
      return await window.api.dayIntradayNote.update(id, { noteTime, action, status });
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const deleteNote = useCallback(async (id) => {
    try {
      return await window.api.dayIntradayNote.delete(id);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const addScreenshot = useCallback(async (dayIntradayNoteId, sourcePath, symbolName, date, fileName) => {
    try {
      const relativePath = await window.api.image.import(sourcePath, symbolName, date, fileName);
      return await window.api.dayIntradayNoteScreenshot.create({ dayIntradayNoteId, filePath: relativePath });
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const addScreenshotFromBuffer = useCallback(async (dayIntradayNoteId, uint8Array, symbolName, date, fileName) => {
    try {
      const relativePath = await window.api.image.saveBuffer(uint8Array, symbolName, date, fileName);
      return await window.api.dayIntradayNoteScreenshot.create({ dayIntradayNoteId, filePath: relativePath });
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const deleteScreenshot = useCallback(async (screenshotId) => {
    try {
      return await window.api.dayIntradayNoteScreenshot.delete(screenshotId);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  return {
    loading,
    error,
    getByTradingDay,
    createNote,
    updateNote,
    deleteNote,
    addScreenshot,
    addScreenshotFromBuffer,
    deleteScreenshot,
  };
}
