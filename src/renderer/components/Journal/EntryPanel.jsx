import React, { useState, useEffect, useCallback } from 'react';
import EntryHeader from './EntryHeader';
import AFootprintBanner from './AFootprintBanner';
import EntryFooter from './EntryFooter';
import NarrativeBlock from './NarrativeBlock';
import PriceRangeFields from './fields/PriceRangeFields';
import FootprintFields from './fields/FootprintFields';
import OtfSymptomPicker from './fields/OtfSymptomPicker';
import VaMigrationFields from './fields/VaMigrationFields';
import ObservationField from './fields/ObservationField';
import BiasPicker from './fields/BiasPicker';
import BiasTriggerField from './fields/BiasTriggerField';
import OpenQuestionField from './fields/OpenQuestionField';
import StructureEventForm from './fields/StructureEventForm';
import { PREV_SESSION_TYPES, GAP_TYPES, EXTENSION_DIRECTIONS, BIAS_DARK } from './journalConstants';

// Merge session-level read-back values into the entry for editing
function buildDraft(entry, session) {
  const d = { ...entry };
  if (entry.row_type === 'pre_session') {
    d.prev_vah = session.prev_vah;
    d.prev_poc = session.prev_poc;
    d.prev_val = session.prev_val;
    d.prev_session_type = session.prev_session_type;
  }
  if (entry.row_type === 'opening') {
    d.opening_price = session.opening_price;
    d.gap_type = session.gap_type;
  }
  if (entry.row_type === 'tpo_a') {
    d.a_vah = session.a_vah;
    d.a_poc = session.a_poc;
    d.a_val = session.a_val;
  }
  return d;
}

function OtfUnavailableNotice() {
  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-[11px]"
      style={{ background: '#FDE8C8', borderColor: '#EF9F27', color: '#633806' }}
    >
      OTF participant symptom tags are available from TPO C onwards — after the Initial Balance is formed.
    </div>
  );
}

function FieldGroup({ children, title }) {
  return (
    <div className="space-y-1">
      {title && <p className="text-[9px] text-gray-600 uppercase tracking-widest">{title}</p>}
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-surface-600/20" />;
}

export default function EntryPanel({ entry, session, onSaved, onInsertStructureEvent, onDeleteEntry, onSelectEntry }) {
  const [draft, setDraft]         = useState(() => buildDraft(entry, session));
  const [isDirty, setIsDirty]     = useState(false);
  const [isSaving, setIsSaving]   = useState(false);
  const [autoFill, setAutoFill]   = useState(null); // null | 'loading' | { ok, msg }
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Reset draft when selected entry changes
  useEffect(() => {
    setDraft(buildDraft(entry, session));
    setIsDirty(false);
    setFetchError(null);
  }, [entry.id, session.id]);

  const handleChange = useCallback((field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const handleAutoFill = useCallback(async () => {
    setAutoFill('loading');
    try {
      const result = await window.api.journal.getPresessionData();
      if (result.error) {
        setAutoFill({ ok: false, msg: result.error });
        return;
      }
      setDraft(prev => ({
        ...prev,
        ...(result.prev_vah          != null && { prev_vah: result.prev_vah }),
        ...(result.prev_poc          != null && { prev_poc: result.prev_poc }),
        ...(result.prev_val          != null && { prev_val: result.prev_val }),
        ...(result.prev_session_type        && { prev_session_type: result.prev_session_type }),
        ...(result.observation              && { observation: result.observation }),
        ...(result.open_question            && { open_question: result.open_question }),
        ...(result.bias                     && { bias: result.bias }),
      }));
      setIsDirty(true);
      setAutoFill({
        ok: true,
        msg: `Filled from ${result.date}${result._conviction_raw ? ` · Conviction: ${result._conviction_raw}` : ''}`,
      });
    } catch {
      setAutoFill({ ok: false, msg: 'Unexpected error reading Excel file.' });
    }
  }, []);

  const handleFetch = useCallback(async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      // IB = A-period + B-period (09:15–10:15). The entry only stores B's window
      // (09:45–10:15), so we reach back to A's start for the full IB range.
      const ibTimeFrom = entry.row_type === 'ib_complete'
        ? (session.entries ?? []).find(e => e.row_type === 'tpo_a')?.time_from ?? '09:15'
        : entry.time_from;
      const result = await window.api.journal.fetchTpoOhlc({
        date:       session.session_date,
        time_from:  ibTimeFrom,
        time_to:    entry.time_to,
        instrument: session.instrument,
      });
      if (result.error) { setFetchError(result.error); return; }
      setDraft(prev => ({
        ...prev,
        ...(result.high  != null && { period_high:  result.high  }),
        ...(result.low   != null && { period_low:   result.low   }),
        ...(result.close != null && { period_close: result.close }),
      }));
      setIsDirty(true);
    } catch {
      setFetchError('Unexpected error during fetch.');
    } finally {
      setIsFetching(false);
    }
  }, [session.session_date, session.instrument, session.entries, entry.row_type, entry.time_from, entry.time_to]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const updatedSession = await window.api.journal.saveEntry(entry.id, draft);
      if (updatedSession) onSaved(updatedSession);
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }, [entry.id, draft, onSaved]);

  const rt        = entry.row_type;
  const biasTheme = entry.bias ? BIAS_DARK[entry.bias] : null;

  const allEntries = session.entries ?? [];
  const currentIdx = allEntries.findIndex(e => e.id === entry.id);
  const prevEntry  = currentIdx > 0 ? allEntries[currentIdx - 1] : null;
  const nextEntry  = currentIdx < allEntries.length - 1 ? allEntries[currentIdx + 1] : null;

  const handleNavigate = useCallback((target) => {
    onSelectEntry(target);
  }, [onSelectEntry]);

  return (
    <div
      className="flex-1 flex flex-col min-h-0 overflow-hidden border-l-4"
      style={{ borderLeftColor: biasTheme ? biasTheme.border : 'transparent' }}
    >
      <EntryHeader
        entry={{ ...entry, bias: draft.bias }}
        sessionDate={session.session_date}
        onInsertStructureEvent={() => onInsertStructureEvent(entry.sort_order)}
        onDeleteEntry={onDeleteEntry}
        onFetch={handleFetch}
        isFetching={isFetching}
        onPrev={prevEntry ? () => handleNavigate(prevEntry) : null}
        onNext={nextEntry ? () => handleNavigate(nextEntry) : null}
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* ── A-Footprint banner (TPO C onwards) ── */}
        {rt === 'tpo' && (session.a_vah != null || session.a_poc != null || session.a_val != null) && (
          <AFootprintBanner session={session} draft={draft} />
        )}

        {/* ── Fetch error banner ── */}
        {fetchError && (
          <div
            className="rounded-lg border px-3 py-2.5 text-[11px] flex items-center justify-between gap-2"
            style={{ background: 'rgba(60,20,20,0.7)', borderColor: 'rgba(200,50,50,0.5)', color: '#f87171' }}
          >
            <span>{fetchError}</span>
            <button
              onClick={() => setFetchError(null)}
              className="shrink-0 text-red-400 hover:text-red-200 transition-colors leading-none"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── pre_session ── */}
        {rt === 'pre_session' && (
          <>
            {/* Auto Fill from Excel */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleAutoFill}
                disabled={autoFill === 'loading'}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
                style={{ background: '#1e2a3a', borderColor: '#2e4a6a', color: '#7ab8e8' }}
              >
                {autoFill === 'loading' ? (
                  <div className="w-3 h-3 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                )}
                Auto Fill from Excel
              </button>
              {autoFill && autoFill !== 'loading' && (
                <span
                  className="text-[10px] truncate"
                  style={{ color: autoFill.ok ? '#5ebd8a' : '#e07070' }}
                >
                  {autoFill.msg}
                </span>
              )}
            </div>

            <div className="flex items-end gap-3 flex-wrap">
              {[['prev_vah', 'Prev VAH', 'text-emerald-400'], ['prev_poc', 'Prev POC', 'text-amber-400'], ['prev_val', 'Prev VAL', 'text-red-400']].map(([f, lbl, cls]) => (
                <div key={f} className="w-24">
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">{lbl}</label>
                  <input type="number" step="0.5" value={draft[f] ?? ''} onChange={e => handleChange(f, e.target.value)} placeholder="0.00" className={`input-field text-sm w-full ${cls}`} />
                </div>
              ))}
              <div className="w-44">
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Session Type</label>
                <select value={draft.prev_session_type ?? ''} onChange={e => handleChange('prev_session_type', e.target.value)} className="input-field text-sm w-full">
                  <option value="">— select —</option>
                  {PREV_SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <Divider />
          </>
        )}

        {/* ── opening ── */}
        {rt === 'opening' && (
          <>
            <FieldGroup title="Opening">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="w-24">
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Opening Price</label>
                  <input type="number" step="0.5" value={draft.opening_price ?? ''} onChange={e => handleChange('opening_price', e.target.value)} placeholder="0.00" className="input-field text-sm w-full text-amber-400" />
                </div>
                <div className="w-44">
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Gap Type</label>
                  <select value={draft.gap_type ?? ''} onChange={e => handleChange('gap_type', e.target.value)} className="input-field text-sm w-full">
                    <option value="">— select —</option>
                    {GAP_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </FieldGroup>
            <Divider />
          </>
        )}

        {/* ── tpo_a ── */}
        {rt === 'tpo_a' && (
          <>
            <div className="flex gap-6 flex-wrap items-start">
              <PriceRangeFields draft={draft} onChange={handleChange} />
              <FootprintFields draft={draft} onChange={handleChange} />
            </div>
            <div className="w-44">
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Extension Direction</label>
              <select value={draft.extension_direction ?? ''} onChange={e => handleChange('extension_direction', e.target.value)} className="input-field text-sm w-full">
                <option value="">— select —</option>
                {EXTENSION_DIRECTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <Divider />
          </>
        )}

        {/* ── ib_complete ── */}
        {rt === 'ib_complete' && (
          <>
            <PriceRangeFields draft={draft} onChange={handleChange} highLabel="IB High" lowLabel="IB Low" rangeLabel="IB Range" />
            <Divider />
          </>
        )}

        {/* ── tpo C onwards ── */}
        {rt === 'tpo' && (() => {
          const allEntries = session.entries ?? [];
          const currentIdx = allEntries.findIndex(e => e.id === entry.id);
          const prevEntry  = currentIdx > 0
            ? allEntries.slice(0, currentIdx).reverse().find(e => e.period_high != null && e.period_low != null)
            : null;
          return (
          <>
            <div className="flex gap-6 flex-wrap items-start">
              <PriceRangeFields draft={draft} onChange={handleChange} />
              <div className="flex items-end gap-3 flex-wrap">
                <VaMigrationFields draft={draft} prevHigh={prevEntry?.period_high} prevLow={prevEntry?.period_low} />
              </div>
            </div>
            <OtfSymptomPicker draft={draft} onChange={handleChange} />
            <Divider />
          </>
          );
        })()}

        {/* ── structure_event ── */}
        {rt === 'structure_event' && (
          <>
            <StructureEventForm draft={draft} onChange={handleChange} />
            <Divider />
          </>
        )}

        {/* ── Common fields ── */}
        {rt !== 'structure_event' && <BiasPicker draft={draft} onChange={handleChange} />}
        {rt !== 'structure_event' && rt !== 'opening' && <BiasTriggerField draft={draft} onChange={handleChange} />}
        {rt !== 'structure_event' && <ObservationField draft={draft} onChange={handleChange} />}
        {rt !== 'opening' && <OpenQuestionField draft={draft} onChange={handleChange} />}

        <NarrativeBlock draft={draft} entry={entry} />
      </div>

      <EntryFooter isDirty={isDirty} isSaving={isSaving} onSave={handleSave} />
    </div>
  );
}
