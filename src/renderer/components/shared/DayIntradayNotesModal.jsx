import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDayIntradayNotes } from '../../hooks/useDayIntradayNotes';
import {
  INTRADAY_STATUSES,
  INTRADAY_STATUS_COLORS,
  INTRADAY_STATUS_KEYS,
  INTRADAY_TIME_OPTIONS,
  formatDate,
} from '../../../shared/constants';

function incrementTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  let newM = m + 15;
  let newH = h;
  if (newM >= 60) { newM -= 60; newH += 1; }
  if (newH > 15 || (newH === 15 && newM > 30)) return '15:30';
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export default function DayIntradayNotesModal({ tradingDay, symbolName, date, onClose, viewOnly = false }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dirtyNotes, setDirtyNotes] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const {
    getByTradingDay, createNote, updateNote, deleteNote,
    addScreenshot, addScreenshotFromBuffer, deleteScreenshot,
  } = useDayIntradayNotes();

  const hasDirty = Object.keys(dirtyNotes).length > 0;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (notes.length > 0) handlePasteToNote(notes[notes.length - 1].id, e);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, notes]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const n = await getByTradingDay(tradingDay.id);
    setNotes(n);
    setLoading(false);
  }, [tradingDay.id, getByTradingDay]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleDirtyChange = (noteId, isDirty, values) => {
    setDirtyNotes(prev => {
      const next = { ...prev };
      if (isDirty) next[noteId] = values; else delete next[noteId];
      return next;
    });
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    for (const [noteId, values] of Object.entries(dirtyNotes)) {
      await updateNote(Number(noteId), values);
    }
    await loadAll();
    setDirtyNotes({});
    setSavingAll(false);
  };

  const handleAddNote = async () => {
    const lastTime = notes.length > 0 ? incrementTime(notes[notes.length - 1].note_time) : '09:15';
    const newNote = await createNote({
      tradingDayId: tradingDay.id,
      noteTime: lastTime,
      action: '',
      status: 'Not-Known',
    });
    if (newNote) setNotes([...notes, { ...newNote, screenshots: [] }]);
  };

  const handleUpdateField = async (noteId, field, value) => {
    let noteTime, action, status;
    if (field === 'save') {
      ({ noteTime, action, status } = value);
    } else {
      const n = notes.find(x => x.id === noteId);
      if (!n) return;
      noteTime = field === 'note_time' ? value : n.note_time;
      action   = field === 'action'    ? value : n.action;
      status   = field === 'status'    ? value : n.status;
    }
    const updated = await updateNote(noteId, { noteTime, action, status });
    if (updated) setNotes(notes.map(n => n.id === noteId ? { ...n, ...updated } : n));
  };

  const handleDeleteNote = async (noteId) => {
    await deleteNote(noteId);
    setNotes(notes.filter(n => n.id !== noteId));
    setDirtyNotes(prev => { const next = { ...prev }; delete next[noteId]; return next; });
  };

  const handleAddScreenshot = async (noteId) => {
    const filePaths = await window.api.dialog.openFile();
    if (!filePaths || filePaths.length === 0) return;
    const filePath = filePaths[0];
    const uniqueName = `${Date.now()}_${filePath.split(/[/\\]/).pop()}`;
    const ss = await addScreenshot(noteId, filePath, symbolName, date, uniqueName);
    if (ss) setNotes(notes.map(n => n.id === noteId ? { ...n, screenshots: [...n.screenshots, ss] } : n));
  };

  const handlePasteToNote = async (noteId, e) => {
    let items = e?.clipboardData?.items;
    if (!items) {
      try { const c = await navigator.clipboard.read(); items = c; } catch { return; }
    }
    for (const item of items) {
      const isImage = item.type?.startsWith('image/') || item.types?.some(t => t.startsWith('image/'));
      if (isImage) {
        if (e?.preventDefault) e.preventDefault();
        let blob;
        if (item.getAsFile) blob = item.getAsFile();
        else { const t = item.types.find(t => t.startsWith('image/')); blob = await item.getType(t); }
        if (!blob) continue;
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const mimeType = blob.type || 'image/png';
        const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
        const fileName = `paste_${Date.now()}.${ext}`;
        const ss = await addScreenshotFromBuffer(noteId, uint8Array, symbolName, date, fileName);
        if (ss) setNotes(prev => prev.map(n => n.id === noteId ? { ...n, screenshots: [...n.screenshots, ss] } : n));
        break;
      }
    }
  };

  const handleDeleteScreenshot = async (noteId, ssId) => {
    await deleteScreenshot(ssId);
    setNotes(notes.map(n => n.id === noteId ? { ...n, screenshots: n.screenshots.filter(s => s.id !== ssId) } : n));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`glass-card flex flex-col transition-all duration-150 ${
          isMaximized ? 'w-full h-full rounded-none' : 'w-full max-w-4xl mx-4'
        }`}
        style={isMaximized ? {} : { height: '82vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-surface-600/30 bg-surface-800/95 backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-sky-500 to-blue-600 shrink-0" />
            <span className="text-xs text-gray-500 font-medium shrink-0">Day Intraday Notes</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-700 text-gray-400 border border-surface-600/50 shrink-0">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </span>
            <span className="text-gray-700 shrink-0">·</span>
            <span className="text-sm font-semibold text-gray-200 truncate">{symbolName}</span>
            <span className="text-[11px] text-gray-500 shrink-0">{formatDate(date)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsMaximized(m => !m)}
              className="w-7 h-7 rounded-lg bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={isMaximized
                  ? 'M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25M9 15H4.5M9 15v4.5M9 15l-5.25 5.25'
                  : 'M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15'} />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            viewOnly ? (
              <div className="flex items-center justify-center h-full select-none pointer-events-none">
                <p className="text-4xl font-bold text-surface-600/60 text-center leading-snug tracking-wide">
                  No Day Notes
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="text-gray-500 text-sm">No day-level notes yet</p>
                <p className="text-gray-600 text-xs">Click "Add Note" to track what's happening across the entire day.</p>
              </div>
            )
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-surface-800/95 backdrop-blur z-10">
                <tr>
                  <th className="text-[10px] text-gray-500 uppercase font-medium text-left px-2 py-1.5 border-b border-surface-600/40 w-[80px]">Time</th>
                  <th className="text-[10px] text-gray-500 uppercase font-medium text-left px-2 py-1.5 border-b border-surface-600/40">Action</th>
                  <th className="text-[10px] text-gray-500 uppercase font-medium text-left px-2 py-1.5 border-b border-surface-600/40 w-[120px]">Status</th>
                  <th className="text-[10px] text-gray-500 uppercase font-medium text-left px-2 py-1.5 border-b border-surface-600/40 w-[70px]">Proof</th>
                  {!viewOnly && <th className="w-[32px] border-b border-surface-600/40"></th>}
                </tr>
              </thead>
              <tbody>
                {notes.map(note => viewOnly ? (
                  <NoteRowReadOnly key={note.id} note={note} />
                ) : (
                  <NoteRow
                    key={note.id}
                    note={note}
                    onUpdateField={handleUpdateField}
                    onDelete={() => handleDeleteNote(note.id)}
                    onAddScreenshot={() => handleAddScreenshot(note.id)}
                    onPasteScreenshot={e => handlePasteToNote(note.id, e)}
                    onDeleteScreenshot={ssId => handleDeleteScreenshot(note.id, ssId)}
                    onDirtyChange={handleDirtyChange}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!viewOnly && (
          <div className="shrink-0 p-3 border-t border-surface-600/30 flex gap-2">
            <button
              onClick={handleAddNote}
              className="flex-1 py-2 rounded-xl bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Note
            </button>
            <button
              onClick={handleSaveAll}
              disabled={!hasDirty || savingAll}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                hasDirty
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300'
                  : 'bg-surface-600/30 text-gray-600 cursor-default'
              }`}
            >
              {savingAll ? (
                <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              Save All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteRowReadOnly({ note }) {
  const statusColors = INTRADAY_STATUS_COLORS[note.status] || INTRADAY_STATUS_COLORS['Not-Known'];
  return (
    <tr className="hover:bg-surface-700/20 transition-colors">
      <td className="border-b border-surface-600/20 px-2 py-2 align-top text-sm text-gray-300 whitespace-nowrap">{note.note_time}</td>
      <td className="border-b border-surface-600/20 px-2 py-2 align-top text-sm text-gray-200 whitespace-pre-wrap">
        {note.action || <span className="text-gray-600 italic">—</span>}
      </td>
      <td className="border-b border-surface-600/20 px-2 py-2 align-top">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
          {note.status}
        </span>
      </td>
      <td className="border-b border-surface-600/20 px-2 py-2 align-top">
        <div className="flex flex-wrap gap-1">
          {note.screenshots?.map(ss => (
            <button
              key={ss.id}
              onClick={() => window.api.image.openViewer(ss.file_path)}
              className="w-6 h-6 rounded overflow-hidden border border-surface-500/40 hover:border-primary-400/60 transition-colors"
            >
              <NoteScreenshotThumb filePath={ss.file_path} />
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
}

function NoteRow({ note, onUpdateField, onDelete, onAddScreenshot, onPasteScreenshot, onDeleteScreenshot, onDirtyChange }) {
  const [localTime, setLocalTime] = useState(note.note_time);
  const [localAction, setLocalAction] = useState(note.action);
  const [localStatus, setLocalStatus] = useState(note.status);

  useEffect(() => {
    setLocalTime(note.note_time);
    setLocalAction(note.action);
    setLocalStatus(note.status);
  }, [note.note_time, note.action, note.status]);

  const isDirty = localTime !== note.note_time || localAction !== note.action || localStatus !== note.status;

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(note.id, isDirty, { noteTime: localTime, action: localAction, status: localStatus });
    }
  }, [isDirty, localTime, localAction, localStatus]);

  const statusColors = INTRADAY_STATUS_COLORS[localStatus] || INTRADAY_STATUS_COLORS['Not-Known'];

  return (
    <tr className={`group hover:bg-surface-700/20 transition-colors ${isDirty ? 'bg-amber-500/5' : ''}`}>
      <td className="border-b border-surface-600/20 px-1 py-1 align-top">
        <input
          type="text"
          list={`day-time-options-${note.id}`}
          value={localTime}
          onChange={e => setLocalTime(e.target.value)}
          className="w-full bg-transparent border-0 px-1 py-1 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500/50 rounded"
          placeholder="HH:MM"
        />
        <datalist id={`day-time-options-${note.id}`}>
          {INTRADAY_TIME_OPTIONS.map(t => <option key={t} value={t} />)}
        </datalist>
      </td>

      <td className="border-b border-surface-600/20 px-1 py-1 align-top">
        <textarea
          value={localAction}
          onChange={e => setLocalAction(e.target.value)}
          rows={2}
          className="w-full bg-transparent border-0 px-1 py-1 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500/50 resize-none rounded"
          placeholder="What's happening across the day…"
        />
      </td>

      <td className="border-b border-surface-600/20 px-1 py-1 align-top">
        <StatusSelector value={localStatus} onChange={setLocalStatus} statusColors={statusColors} />
      </td>

      <td className="border-b border-surface-600/20 px-1 py-1 align-top">
        <div className="flex flex-wrap gap-1 items-center">
          {note.screenshots && note.screenshots.map(ss => (
            <NoteScreenshotThumb key={ss.id} filePath={ss.file_path} onDelete={() => onDeleteScreenshot(ss.id)} />
          ))}
          <div tabIndex={0} onPaste={onPasteScreenshot}>
            <button
              onClick={onAddScreenshot}
              className="w-5 h-5 rounded bg-surface-600/40 hover:bg-surface-600/70 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
              title="Add screenshot (or Ctrl+V to paste)"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </td>

      <td className="border-b border-surface-600/20 px-1 py-1 align-top">
        <button
          onClick={onDelete}
          className="w-5 h-5 rounded hover:bg-red-500/20 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 mx-auto"
          title="Delete note"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

function StatusSelector({ value, onChange, statusColors }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      const idx = INTRADAY_STATUSES.indexOf(value);
      setHighlight(idx >= 0 ? idx : 0);
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setDropUp(window.innerHeight - rect.bottom < 220);
      }
    }
  }, [open, value]);

  const handleKeyDown = (e) => {
    if (!open) {
      const mapped = INTRADAY_STATUS_KEYS[e.key];
      if (mapped) { e.preventDefault(); onChange(mapped); return; }
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open && highlight >= 0) { onChange(INTRADAY_STATUSES[highlight]); setOpen(false); } else setOpen(true);
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true); else setHighlight(h => Math.min(h + 1, INTRADAY_STATUSES.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true); else setHighlight(h => Math.max(h - 1, 0));
      return;
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className={`w-full border rounded-lg px-2 py-1.5 text-xs font-medium text-left focus:outline-none focus:ring-1 focus:ring-primary-500/50 ${statusColors.bg} ${statusColors.text} ${statusColors.border} cursor-pointer flex items-center justify-between gap-1`}
      >
        <span className="truncate">{value}</span>
        <svg className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className={`absolute z-50 left-0 w-full bg-surface-800 border border-surface-500/40 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {INTRADAY_STATUSES.map((s, i) => {
            const c = INTRADAY_STATUS_COLORS[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => { onChange(s); setOpen(false); }}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full px-2 py-1.5 text-xs text-left flex items-center gap-2 transition-colors ${
                  i === highlight ? 'bg-surface-600/70' : 'hover:bg-surface-600/50'
                } ${s === value ? `${c.bg} ${c.text}` : 'text-gray-300'}`}
              >
                <span className="w-4 text-gray-500 text-[10px] text-right shrink-0">{i + 1}</span>
                <span className="truncate">{s}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NoteScreenshotThumb({ filePath, onDelete }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    window.api.image.getFullPath(filePath).then(async (full) => {
      if (full) {
        const url = await window.api.image.toDataUrl(full);
        if (url) setSrc(url);
      }
    });
  }, [filePath]);

  return (
    <div className="relative group w-5 h-5">
      <button
        onClick={() => window.api.image.openViewer(filePath)}
        className="w-5 h-5 rounded overflow-hidden border border-surface-500/40 hover:border-primary-400/60 transition-colors block"
        title="Click to view"
      >
        {src ? (
          <img src={src} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-surface-700" />
        )}
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove"
        >
          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
