import React, { useState } from 'react';

export default function SessionSidebar({
  sessions, selectedSession, symbols,
  onSelectSession, onCreateSession, onDeleteSession,
  sessionsOpen, onToggleSessions,
}) {
  const [showForm, setShowForm]               = useState(false);
  const [newDate, setNewDate]                 = useState('');
  const [newSymbolId, setNewSymbolId]         = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleCreate = async () => {
    if (!newDate || !newSymbolId || submitting) return;
    const sym = symbols.find(s => s.id === Number(newSymbolId));
    if (!sym) return;
    setSubmitting(true);
    try {
      await onCreateSession(newDate, sym.name);
      setShowForm(false);
      setNewDate('');
      setNewSymbolId('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`flex flex-col h-full border-r border-surface-600/30 bg-surface-800/50 shrink-0 transition-[width] duration-200 overflow-hidden ${
      sessionsOpen ? 'w-[220px]' : 'w-0'
    }`}>
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-surface-600/30 flex items-center justify-between shrink-0">
        <button
          onClick={onToggleSessions}
          className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 hover:bg-surface-600 transition-colors"
          title="Hide sessions"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Sessions</span>
        <button
          onClick={() => setShowForm(v => !v)}
          className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-gray-200 hover:bg-surface-600 transition-colors"
          title="New session"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* New session form */}
      {showForm && (
        <div className="px-3 py-2.5 border-b border-surface-600/30 space-y-2 bg-surface-700/30 shrink-0">
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="input-field text-xs w-full"
            autoFocus
          />
          <select
            value={newSymbolId}
            onChange={e => setNewSymbolId(e.target.value)}
            className="input-field text-xs w-full"
          >
            <option value="">— symbol —</option>
            {symbols.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <button
              onClick={handleCreate}
              disabled={!newDate || !newSymbolId || submitting}
              className="flex-1 text-xs py-1 rounded font-medium text-white transition-opacity disabled:opacity-40"
              style={{ background: '#0077BB' }}
            >
              {submitting ? '…' : 'Create'}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewDate(''); setNewSymbolId(''); }}
              className="text-xs py-1 px-2 rounded text-gray-500 hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Session list */}
      <div
        className="overflow-y-auto border-b border-surface-600/30 shrink-0"
        style={{ maxHeight: '150px' }}
      >
        {sessions.length === 0 ? (
          <p className="text-[11px] text-gray-600 px-3 py-3">No sessions yet.</p>
        ) : (
          <div className="p-1 space-y-0.5">
            {sessions.map(s => {
              const isActive      = selectedSession?.id === s.id;
              const isConfirming  = confirmDeleteId === s.id;
              return (
                <div
                  key={s.id}
                  className={`group flex items-center gap-1 px-2 py-1.5 rounded text-[11px] transition-colors border ${
                    isActive ? '' : 'border-transparent hover:bg-surface-700/60'
                  }`}
                  style={isActive
                    ? { background: 'rgba(0,119,187,0.15)', borderColor: 'rgba(0,119,187,0.3)' }
                    : {}}
                >
                  <button
                    onClick={() => { setConfirmDeleteId(null); onSelectSession(s.id); }}
                    className="flex-1 text-left truncate font-semibold"
                    style={{ color: isActive ? '#e5e7eb' : '#6b7280' }}
                  >
                    {s.session_date}
                  </button>

                  {isConfirming ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-red-400">Del?</span>
                      <button
                        onClick={() => { setConfirmDeleteId(null); onDeleteSession(s.id); }}
                        className="text-[10px] px-1 py-0.5 rounded border text-red-400 hover:bg-red-500/20 transition-colors"
                        style={{ borderColor: 'rgba(239,68,68,0.4)' }}
                        title="Confirm delete"
                      >✓</button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors leading-none"
                        title="Cancel"
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDeleteId(s.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-gray-600 hover:text-red-400"
                      title="Delete session"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
