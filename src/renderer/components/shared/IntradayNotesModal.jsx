import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useIntradayNotes } from '../../hooks/useIntradayNotes';
import {
  INTRADAY_STATUSES,
  INTRADAY_STATUS_COLORS,
  INTRADAY_STATUS_KEYS,
  INTRADAY_TIME_OPTIONS,
  BEHAVIOR_TAGS,
  OUTCOME_COLORS,
  CUSTOM_VERDICT_COLORS,
  BIAS_COLORS,
  POSSIBILITIES,
  getOutcomeColors,
  formatPossibilityCode,
} from '../../../shared/constants';

function incrementTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  let newM = m + 15;
  let newH = h;
  if (newM >= 60) { newM -= 60; newH += 1; }
  if (newH > 15 || (newH === 15 && newM > 30)) return '15:30';
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export default function IntradayNotesModal({ entry, tradingDay, customPlans, symbolName, date, onClose, viewOnly = false }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dirtyNotes, setDirtyNotes] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [splitPercent, setSplitPercent] = useState(38);
  const [isMaximized, setIsMaximized] = useState(false);
  const isDragging = useRef(false);
  const containerRef = useRef(null);
  const { getNotesByDay, createNote, updateNote, updateAttachment, deleteNote, addScreenshot, addScreenshotFromBuffer, deleteScreenshot } = useIntradayNotes();

  const hasDirty = Object.keys(dirtyNotes).length > 0;

  /* ── Build available attachments from tradingDay + customPlans ── */
  const availableAttachments = useMemo(() => {
    const list = [
      { outcomePlanId: null, customPlanId: null, label: '— None —', shortLabel: 'None', outcomeColor: null, isCustom: false }
    ];

    if (tradingDay?.possibilities) {
      for (const p of tradingDay.possibilities) {
        if (p.has_plan !== 1 || !p.outcomePlans) continue;
        for (const op of p.outcomePlans) {
          list.push({
            outcomePlanId: op.id,
            customPlanId: null,
            label: `${formatPossibilityCode(p.code)} · ${op.outcome}`,
            shortLabel: op.outcome,
            outcomeColor: getOutcomeColors(op.outcome, POSSIBILITIES.find(sp => sp.code === p.code)?.bias) || null,
            possibilityCode: p.code,
            outcome: op.outcome,
            isCustom: false,
          });
        }
      }
    }

    for (const cp of customPlans || []) {
      list.push({
        outcomePlanId: null,
        customPlanId: cp.id,
        label: cp.title || 'Custom Plan',
        shortLabel: (cp.title || 'Custom').slice(0, 10),
        outcomeColor: null,
        isCustom: true,
      });
    }

    return list;
  }, [tradingDay, customPlans]);

  /* ── Drag-to-resize ── */
  const handleDragStart = useCallback((e) => {
    isDragging.current = true;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
      setSplitPercent(Math.min(Math.max(pct, 15), 72));
    };
    const handleMouseUp = () => { isDragging.current = false; };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  /* ── Keyboard shortcuts ── */
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

  /* ── Load all day-level notes ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getNotesByDay(entry.tradingDayId);
      setNotes(data);
      setLoading(false);
    };
    load();
  }, [entry.tradingDayId, getNotesByDay]);

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
    const data = await getNotesByDay(entry.tradingDayId);
    setNotes(data);
    setDirtyNotes({});
    setSavingAll(false);
  };

  const handleAddNote = async () => {
    const lastTime = notes.length > 0 ? incrementTime(notes[notes.length - 1].note_time) : '09:15';
    const newNote = await createNote({
      tradingDayId: entry.tradingDayId,
      outcomePlanId: entry.outcomePlanId || null,
      customPlanId: entry.customPlanId || null,
      noteTime: lastTime,
      action: '',
      status: 'Not-Known',
    });
    if (newNote) setNotes([...notes, { ...newNote, screenshots: [] }]);
  };

  const handleUpdateField = async (noteId, field, value) => {
    let noteTime, action, status;
    if (field === 'save') {
      noteTime = value.noteTime; action = value.action; status = value.status;
    } else {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;
      noteTime = field === 'note_time' ? value : note.note_time;
      action = field === 'action' ? value : note.action;
      status = field === 'status' ? value : note.status;
    }
    const updated = await updateNote(noteId, { noteTime, action, status });
    if (updated) setNotes(notes.map(n => n.id === noteId ? { ...n, ...updated } : n));
  };

  const handleAttachmentChange = async (noteId, outcomePlanId, customPlanId) => {
    const updated = await updateAttachment(noteId, outcomePlanId, customPlanId);
    if (updated) {
      setNotes(prev => prev.map(n => n.id === noteId
        ? { ...n, outcome_plan_id: updated.outcome_plan_id, custom_plan_id: updated.custom_plan_id }
        : n
      ));
    }
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
        if (item.getAsFile) { blob = item.getAsFile(); }
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

  /* ── Derived colors for header ── */
  const tagColors = entry.tag ? BEHAVIOR_TAGS[entry.tag] : null;
  const outcomeColors = entry.isCustom
    ? (entry.outcome ? CUSTOM_VERDICT_COLORS[entry.outcome] : null)
    : getOutcomeColors(entry.outcome, entry.possibilityBias);
  const biasColors = entry.possibilityBias ? BIAS_COLORS[entry.possibilityBias] : null;
  const screenshots = entry.screenshots || [];

  /* ── Note count indicator ── */
  const attachedCount = notes.filter(n =>
    (entry.outcomePlanId && n.outcome_plan_id === entry.outcomePlanId) ||
    (entry.customPlanId && n.custom_plan_id === entry.customPlanId)
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`glass-card flex flex-col transition-all duration-150 ${
          isMaximized ? 'w-full h-full rounded-none' : 'w-full max-w-6xl mx-4'
        }`}
        style={isMaximized ? {} : { height: '88vh' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Compact Header ── */}
        <div className="shrink-0 flex flex-col border-b border-surface-600/30 bg-surface-800/95 backdrop-blur">
          {/* Title row */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-500 to-orange-500 shrink-0" />
              <span className="text-xs text-gray-500 font-medium">Plan Analysis</span>
              <svg className="w-3 h-3 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-sm font-semibold text-gray-200">Intra Day Notes</span>
              {/* Day-level badge */}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-700 text-gray-400 border border-surface-600/50">
                All Day · {notes.length} note{notes.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsMaximized(m => !m)}
                className="w-7 h-7 rounded-lg bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                title={isMaximized ? 'Restore' : 'Maximize'}
              >
                {isMaximized ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25M9 15H4.5M9 15v4.5M9 15l-5.25 5.25" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                )}
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
          {/* Plan detail row — shows the context we came from */}
          <div className="flex items-center gap-2 flex-wrap min-w-0 px-4 pb-2.5">
            {tagColors && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${tagColors.bg} ${tagColors.text} ${tagColors.border} shrink-0`}>
                {entry.tag}
              </span>
            )}
            {biasColors && (
              <span className={`w-2 h-2 rounded-full shrink-0 ${entry.possibilityBias === 'Bullish' ? 'bg-blue-400' : 'bg-red-400'}`} />
            )}
            <span className="text-sm font-semibold text-gray-200 truncate">
              {entry.isCustom
                ? (entry.possibilityCode || 'Custom Plan')
                : formatPossibilityCode(entry.possibilityCode)}
            </span>
            {outcomeColors && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${outcomeColors.bg} ${outcomeColors.text} ${outcomeColors.border} shrink-0`}>
                {entry.outcome}
              </span>
            )}
            {(entry.target != null || entry.stopOut != null) && (
              <span className="text-gray-700 shrink-0">·</span>
            )}
            {entry.target != null && (
              <span className="shrink-0 flex items-center gap-1">
                <span className="text-[10px] text-gray-500">T</span>
                <span className="text-xs font-bold text-emerald-400">{entry.target}</span>
              </span>
            )}
            {entry.stopOut != null && (
              <span className="shrink-0 flex items-center gap-1">
                <span className="text-[10px] text-gray-500">S</span>
                <span className="text-xs font-bold text-red-400">{entry.stopOut}</span>
              </span>
            )}
            {attachedCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                {attachedCount} attached here
              </span>
            )}
          </div>
        </div>

        {/* ── Resizable Body ── */}
        <div ref={containerRef} className="flex-1 flex min-h-0 overflow-hidden select-none">

          {/* ── Screenshot Panel ── */}
          <div
            className="shrink-0 flex flex-col overflow-hidden bg-surface-900/40 border-r border-surface-600/20"
            style={{ width: `${splitPercent}%` }}
          >
            {screenshots.length > 0 ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {screenshots.map(ss => (
                  <ScreenshotPanel key={ss.id} filePath={ss.file_path} />
                ))}
                {entry.description && (
                  <div className="mt-2 px-1 pb-1">
                    <p className="text-[10px] text-gray-500 uppercase mb-1">Trade Plan</p>
                    <p className="text-xs text-gray-300 leading-relaxed">{entry.description}</p>
                  </div>
                )}
              </div>
            ) : entry.description ? (
              <div className="flex-1 overflow-y-auto p-3">
                <p className="text-[10px] text-gray-500 uppercase mb-1">Trade Plan</p>
                <p className="text-xs text-gray-300 leading-relaxed">{entry.description}</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-700 p-4">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <p className="text-xs text-center">No outcome screenshots</p>
              </div>
            )}
          </div>

          {/* ── Drag Handle ── */}
          <div
            className="w-1.5 shrink-0 cursor-col-resize relative flex items-center justify-center bg-surface-700/30 hover:bg-primary-500/30 transition-colors group"
            onMouseDown={handleDragStart}
          >
            <div className="w-0.5 h-10 rounded-full bg-surface-500 group-hover:bg-primary-400 group-active:bg-primary-300 transition-colors" />
          </div>

          {/* ── Notes Panel ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                </div>
              ) : notes.length === 0 ? (
                viewOnly ? (
                  <div className="flex items-center justify-center h-full select-none pointer-events-none">
                    <p className="text-4xl font-bold text-surface-600/60 text-center leading-snug tracking-wide">
                      No Notes<br />for the Outcome
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                    <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p className="text-gray-500 text-sm">No intraday notes yet</p>
                    <p className="text-gray-600 text-xs">Click "Add Note" to start — notes are shared across all outcomes for this day</p>
                  </div>
                )
              ) : (
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-surface-800/95 backdrop-blur z-10">
                      <tr>
                        <th className="text-[10px] text-gray-500 uppercase font-medium text-left px-2 py-1.5 border-b border-surface-600/40 w-[80px]">Time</th>
                        <th className="text-[10px] text-gray-500 uppercase font-medium text-left px-2 py-1.5 border-b border-surface-600/40">Action</th>
                        <th className="text-[10px] text-gray-500 uppercase font-medium text-left px-2 py-1.5 border-b border-surface-600/40 w-[120px]">Status</th>
                        {!viewOnly && <th className="text-[10px] text-gray-500 uppercase font-medium text-left px-2 py-1.5 border-b border-surface-600/40 w-[120px]">Attach</th>}
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
                          availableAttachments={availableAttachments}
                          onAttachmentChange={handleAttachmentChange}
                        />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ── Footer — hidden in viewOnly ── */}
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
      </div>
    </div>
  );
}

/* ─── Screenshot Panel (full-width, aspect-video) ─── */
function ScreenshotPanel({ filePath }) {
  const [src, setSrc] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    window.api.image.getFullPath(filePath).then(async (fullPath) => {
      if (fullPath) {
        const dataUrl = await window.api.image.toDataUrl(fullPath);
        if (dataUrl) setSrc(dataUrl);
      }
    });
  }, [filePath]);

  return (
    <button
      onClick={() => window.api.image.openViewer(filePath)}
      className="relative group w-full rounded-lg overflow-hidden border border-surface-500/40 hover:border-primary-400/60 transition-all hover:shadow-lg hover:shadow-primary-500/10"
      title="Click to view full size"
    >
      <div className="aspect-video w-full">
        {src ? (
          <>
            <img
              src={src}
              alt=""
              className={`w-full h-full object-contain bg-surface-900 transition-all group-hover:brightness-90 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setLoaded(true)}
              onError={() => setSrc(null)}
            />
            {!loaded && <div className="absolute inset-0 bg-surface-800 animate-pulse" />}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/40 rounded-full p-2">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-surface-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}

/* ─── Note Row (read-only, for Gallery view) ─── */
function NoteRowReadOnly({ note }) {
  const statusColors = INTRADAY_STATUS_COLORS[note.status] || INTRADAY_STATUS_COLORS['Not-Known'];
  return (
    <tr className="hover:bg-surface-700/20 transition-colors">
      <td className="border-b border-surface-600/20 px-2 py-2 align-top text-sm text-gray-300 whitespace-nowrap">{note.note_time}</td>
      <td className="border-b border-surface-600/20 px-2 py-2 align-top text-sm text-gray-200 whitespace-pre-wrap">{note.action || <span className="text-gray-600 italic">—</span>}</td>
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
              <NoteScreenshotThumb filePath={ss.file_path} readOnly />
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
}

/* ─── Note Row ─── */
function NoteRow({ note, onUpdateField, onDelete, onAddScreenshot, onPasteScreenshot, onDeleteScreenshot, onDirtyChange, availableAttachments, onAttachmentChange }) {
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
          list={`time-options-${note.id}`}
          value={localTime}
          onChange={e => setLocalTime(e.target.value)}
          className="w-full bg-transparent border-0 px-1 py-1 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500/50 rounded"
          placeholder="HH:MM"
        />
        <datalist id={`time-options-${note.id}`}>
          {INTRADAY_TIME_OPTIONS.map(t => <option key={t} value={t} />)}
        </datalist>
      </td>

      <td className="border-b border-surface-600/20 px-1 py-1 align-top">
        <textarea
          value={localAction}
          onChange={e => setLocalAction(e.target.value)}
          rows={2}
          className="w-full bg-transparent border-0 px-1 py-1 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500/50 resize-none rounded"
          placeholder="What's happening in the market..."
        />
      </td>

      <td className="border-b border-surface-600/20 px-1 py-1 align-top">
        <StatusSelector value={localStatus} onChange={val => setLocalStatus(val)} statusColors={statusColors} />
      </td>

      <td className="border-b border-surface-600/20 px-1 py-1 align-top">
        <AttachmentCell
          note={note}
          availableAttachments={availableAttachments}
          onChange={onAttachmentChange}
        />
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

/* ─── Attachment Cell ─── */
function AttachmentCell({ note, availableAttachments, onChange }) {
  const [open, setOpen] = useState(false);
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
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropUp(window.innerHeight - rect.bottom < 180);
    }
  }, [open]);

  const current = availableAttachments.find(a => {
    if (a.outcomePlanId != null) return a.outcomePlanId === note.outcome_plan_id;
    if (a.customPlanId != null) return a.customPlanId === note.custom_plan_id;
    return note.outcome_plan_id == null && note.custom_plan_id == null;
  }) || availableAttachments[0];

  const isNone = !current.outcomePlanId && !current.customPlanId;
  const c = current.outcomeColor;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full border rounded-md px-1.5 py-1 text-[11px] font-medium text-left flex items-center justify-between gap-1 transition-colors ${
          isNone
            ? 'bg-surface-700/50 text-gray-500 border-surface-600/50 hover:border-surface-500'
            : c
              ? `${c.bg} ${c.text} ${c.border}`
              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
        }`}
      >
        <span className="truncate">{current.shortLabel}</span>
        <svg className={`w-2.5 h-2.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className={`absolute z-50 left-0 min-w-[200px] bg-surface-800 border border-surface-500/40 rounded-lg shadow-xl overflow-hidden ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          {availableAttachments.map((a, i) => {
            const aIsNone = !a.outcomePlanId && !a.customPlanId;
            const isSelected = aIsNone
              ? (note.outcome_plan_id == null && note.custom_plan_id == null)
              : a.outcomePlanId != null
                ? a.outcomePlanId === note.outcome_plan_id
                : a.customPlanId === note.custom_plan_id;
            const ac = a.outcomeColor;
            return (
              <button
                key={i}
                type="button"
                onClick={() => { onChange(note.id, a.outcomePlanId, a.customPlanId); setOpen(false); }}
                className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 transition-colors hover:bg-surface-600/50 ${
                  isSelected ? (ac ? `${ac.bg} ${ac.text}` : 'bg-surface-600/70 text-gray-300') : 'text-gray-300'
                }`}
              >
                {!aIsNone && ac && <span className={`w-2 h-2 rounded-full shrink-0 ${ac.bg}`} />}
                {!aIsNone && !ac && <span className="w-2 h-2 rounded-full shrink-0 bg-cyan-400" />}
                {aIsNone && <span className="w-2 h-2 shrink-0" />}
                <span className="truncate">{a.label}</span>
                {isSelected && (
                  <svg className="w-3 h-3 ml-auto text-primary-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Status Selector ─── */
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
        const modal = ref.current.closest('.overflow-y-auto');
        if (modal) {
          const mRect = modal.getBoundingClientRect();
          setDropUp(mRect.bottom - rect.bottom < 200 && rect.top - mRect.top > mRect.bottom - rect.bottom);
        } else {
          setDropUp(window.innerHeight - rect.bottom < 200);
        }
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
                <span>{s}</span>
                {s === value && (
                  <svg className="w-3 h-3 ml-auto text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Note Screenshot Thumbnail ─── */
function NoteScreenshotThumb({ filePath, onDelete, readOnly = false }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    window.api.image.getFullPath(filePath).then(async (fullPath) => {
      if (fullPath) {
        const dataUrl = await window.api.image.toDataUrl(fullPath);
        if (dataUrl) setSrc(dataUrl);
      }
    });
  }, [filePath]);

  return (
    <div className="relative group/ss w-6 h-6 rounded overflow-hidden border border-surface-500/40">
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover cursor-pointer hover:opacity-75 transition-opacity" onClick={() => window.api.image.openViewer(filePath)} />
      ) : (
        <div className="w-full h-full bg-surface-700 animate-pulse" />
      )}
      {!readOnly && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/ss:opacity-100 transition-opacity"
          title="Delete screenshot"
        >
          <svg className="w-1.5 h-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
