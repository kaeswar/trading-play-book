import { useState, useCallback } from 'react';

export function useIntradayNotes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getNotes = useCallback(async ({ outcomePlanId, customPlanId }) => {
    try {
      setLoading(true);
      let notes;
      if (outcomePlanId) {
        notes = await window.api.intradayNote.getByOutcomePlan(outcomePlanId);
      } else {
        notes = await window.api.intradayNote.getByCustomPlan(customPlanId);
      }
      const notesWithScreenshots = [];
      for (const note of notes) {
        const screenshots = await window.api.intradayNoteScreenshot.getByIntradayNote(note.id);
        notesWithScreenshots.push({ ...note, screenshots });
      }
      return notesWithScreenshots;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getNotesByDay = useCallback(async (tradingDayId) => {
    try {
      setLoading(true);
      const notes = await window.api.intradayNote.getByTradingDay(tradingDayId);
      const notesWithScreenshots = [];
      for (const note of notes) {
        const screenshots = await window.api.intradayNoteScreenshot.getByIntradayNote(note.id);
        notesWithScreenshots.push({ ...note, screenshots });
      }
      return notesWithScreenshots;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createNote = useCallback(async ({ tradingDayId, outcomePlanId, customPlanId, noteTime, action, status }) => {
    try {
      return await window.api.intradayNote.create({
        tradingDayId: tradingDayId || null,
        outcomePlanId: outcomePlanId || null,
        customPlanId: customPlanId || null,
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

  const updateAttachment = useCallback(async (noteId, outcomePlanId, customPlanId) => {
    try {
      return await window.api.intradayNote.updateAttachment(noteId, {
        outcomePlanId: outcomePlanId || null,
        customPlanId: customPlanId || null,
      });
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
    getNotes,
    getNotesByDay,
    createNote,
    updateNote,
    updateAttachment,
    deleteNote,
    addScreenshot,
    addScreenshotFromBuffer,
    deleteScreenshot,
  };
}
