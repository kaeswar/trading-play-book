import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../store/appStore';
import { ROW_TYPE_LABEL } from './journalConstants';
import SessionSidebar from './SessionSidebar';
import TpoSequencePanel from './TpoSequencePanel';
import EntryPanel from './EntryPanel';
import WholeDaySummary from './WholeDaySummary';

export default function SessionJournalPage({ navOpen, onToggleNav }) {
  const { symbols, setStatusBarInfo } = useApp();
  const [sessions, setSessions]               = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedEntry, setSelectedEntry]     = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [sessionsOpen, setSessionsOpen]       = useState(true);

  useEffect(() => {
    if (!selectedSession) {
      setStatusBarInfo(null);
      return;
    }
    let tpoLabel = null;
    if (selectedEntry) {
      if (selectedEntry.row_type === 'whole_day') {
        tpoLabel = 'Whole Day';
      } else if (selectedEntry.row_type === 'tpo') {
        tpoLabel = `TPO ${selectedEntry.tpo_label}`;
      } else {
        tpoLabel = ROW_TYPE_LABEL[selectedEntry.row_type] || selectedEntry.tpo_label;
      }
    }
    setStatusBarInfo({
      instrument:  selectedSession.instrument,
      sessionDate: selectedSession.session_date,
      tpoLabel,
    });
    return () => setStatusBarInfo(null);
  }, [selectedSession, selectedEntry]);

  const loadSessions = useCallback(async () => {
    const list = await window.api.journal.getSessions();
    setSessions(list);
    return list;
  }, []);

  const loadSession = useCallback(async (id, keepEntryId = null) => {
    const session = await window.api.journal.getSession(id);
    setSelectedSession(session);
    setSelectedEntry(() => {
      const entries = session.entries ?? [];
      if (keepEntryId) {
        const found = entries.find(e => e.id === keepEntryId);
        if (found) return found;
      }
      return entries[0] ?? null;
    });
    return session;
  }, []);

  useEffect(() => {
    setLoading(true);
    loadSessions().then(list => {
      if (list.length > 0) loadSession(list[0].id);
      setLoading(false);
    });
  }, []);

  const handleCreateSession = useCallback(async (date, instrument) => {
    await window.api.journal.createSession({ sessionDate: date, instrument });
    const list = await loadSessions();
    if (list.length > 0) await loadSession(list[0].id);
  }, [loadSessions, loadSession]);

  const handleSelectSession = useCallback(async (id) => {
    await loadSession(id);
  }, [loadSession]);

  const handleSaved = useCallback((updatedSession) => {
    setSelectedSession(updatedSession);
    setSessions(prev =>
      prev.map(s => s.id === updatedSession.id ? { ...s, session_date: updatedSession.session_date } : s)
    );
    setSelectedEntry(prev => {
      if (!prev) return null;
      return updatedSession.entries?.find(e => e.id === prev.id) ?? prev;
    });
  }, []);

  const handleInsertStructureEvent = useCallback(async (afterSortOrder) => {
    if (!selectedSession) return;
    const updated = await window.api.journal.insertStructureEvent(selectedSession.id, afterSortOrder);
    if (!updated) return;
    setSelectedSession(updated);
    const structs = (updated.entries ?? []).filter(e => e.row_type === 'structure_event');
    if (structs.length > 0) {
      const newest = structs.reduce((a, b) => (a.id > b.id ? a : b));
      setSelectedEntry(newest);
    }
  }, [selectedSession]);

  const handleDeleteEntry = useCallback(async () => {
    if (!selectedEntry || !selectedSession) return;
    const updated = await window.api.journal.deleteEntry(selectedEntry.id);
    if (!updated) return;
    setSelectedSession(updated);
    setSelectedEntry(updated.entries?.[0] ?? null);
  }, [selectedEntry, selectedSession]);

  const handleDeleteSession = useCallback(async (id) => {
    await window.api.journal.deleteSession(id);
    const list = await loadSessions();
    if (selectedSession?.id === id) {
      if (list.length > 0) {
        await loadSession(list[0].id);
      } else {
        setSelectedSession(null);
        setSelectedEntry(null);
      }
    }
  }, [selectedSession, loadSessions, loadSession]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Loading sessions…
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <SessionSidebar
        sessions={sessions}
        selectedSession={selectedSession}
        symbols={symbols}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
        sessionsOpen={sessionsOpen}
        onToggleSessions={() => setSessionsOpen(v => !v)}
      />

      <TpoSequencePanel
        session={selectedSession}
        selectedEntry={selectedEntry}
        onSelectEntry={setSelectedEntry}
        navOpen={navOpen}
        onToggleNav={onToggleNav}
        sessionsOpen={sessionsOpen}
        onToggleSessions={() => setSessionsOpen(v => !v)}
      />

      <div className="flex-1 flex overflow-hidden">
        {!selectedSession ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
            <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-gray-600 text-sm">No sessions yet.</p>
            <p className="text-gray-700 text-xs">Click the + button in the sidebar to create your first session.</p>
          </div>
        ) : !selectedEntry ? (
          <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
            Select a TPO period from the sidebar to begin
          </div>
        ) : selectedEntry?.row_type === 'whole_day' ? (
          <WholeDaySummary
            session={selectedSession}
            onSelectEntry={setSelectedEntry}
          />
        ) : (
          <EntryPanel
            key={selectedEntry.id}
            entry={selectedEntry}
            session={selectedSession}
            onSaved={handleSaved}
            onInsertStructureEvent={handleInsertStructureEvent}
            onDeleteEntry={handleDeleteEntry}
            onSelectEntry={setSelectedEntry}
          />
        )}
      </div>
    </div>
  );
}
