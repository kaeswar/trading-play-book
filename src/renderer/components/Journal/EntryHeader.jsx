import React from 'react';
import { ROW_TYPE_LABEL, BIAS_DARK } from './journalConstants';

function TpoBadge({ label, rowType }) {
  const isStruct = rowType === 'structure_event';
  return (
    <div
      className="w-9 h-9 rounded flex items-center justify-center text-sm font-bold shrink-0 border"
      style={isStruct
        ? { background: '#FAD8CC', borderColor: '#712B13', color: '#712B13' }
        : { background: '#1e2130', borderColor: '#2e3348', color: '#a5b4fc' }}
    >
      {label}
    </div>
  );
}

const FETCH_ROW_TYPES = ['tpo_a', 'ib_complete', 'tpo'];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${MONTHS[parseInt(m, 10) - 1]}-${y}`;
}

export default function EntryHeader({ entry, sessionDate, onInsertStructureEvent, onDeleteEntry, onFetch, isFetching, onPrev, onNext }) {
  const title = entry.row_type === 'tpo'
    ? `TPO ${entry.tpo_label}`
    : ROW_TYPE_LABEL[entry.row_type] || entry.tpo_label;

  const timeStr = entry.time_from
    ? entry.time_to
      ? `${entry.time_from} – ${entry.time_to}`
      : entry.time_from
    : '';

  const biasTheme = entry.bias ? BIAS_DARK[entry.bias] : null;

  return (
    <div
      className="shrink-0 relative flex items-center justify-between px-5 py-3.5 border-b"
      style={{
        background: biasTheme ? biasTheme.bg : 'rgba(30,33,48,0.8)',
        borderBottomColor: biasTheme ? biasTheme.border : 'rgba(60,65,90,0.3)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <TpoBadge label={entry.tpo_label} rowType={entry.row_type} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-100 truncate">{title}</p>
          {timeStr && <p className="text-[11px]" style={{ color: biasTheme ? biasTheme.text : '#6b7280' }}>{timeStr} IST</p>}
        </div>
        {biasTheme && (
          <span
            className="text-[10px] px-2.5 py-0.5 rounded-full border font-bold ml-1"
            style={{ background: biasTheme.bg, borderColor: biasTheme.border, color: biasTheme.text }}
          >
            {biasTheme.label} · {entry.bias.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Date — absolutely centered so it stays in the middle independent of left/right widths */}
      {sessionDate && (
        <span className="absolute left-1/2 -translate-x-1/2 text-sm font-bold text-gray-200 tracking-wide pointer-events-none select-none">
          {fmtDate(sessionDate)}
        </span>
      )}
      <div className="flex items-center gap-2 shrink-0">
        {/* Prev / Next navigation */}
        <div className="flex items-center rounded-lg overflow-hidden border border-surface-500/40">
          <button
            onClick={onPrev}
            disabled={!onPrev}
            title="Previous TPO"
            className="px-2 py-1.5 text-gray-400 hover:text-gray-100 hover:bg-surface-600/60 disabled:opacity-25 disabled:cursor-not-allowed transition-colors border-r border-surface-500/40"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={onNext}
            disabled={!onNext}
            title="Next TPO"
            className="px-2 py-1.5 text-gray-400 hover:text-gray-100 hover:bg-surface-600/60 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {FETCH_ROW_TYPES.includes(entry.row_type) && (
          <button
            onClick={onFetch}
            disabled={isFetching}
            className="text-[11px] px-2.5 py-1 rounded-lg border bg-surface-700/60 border-surface-500/50 text-indigo-400 hover:text-indigo-200 hover:bg-surface-600/60 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Fetch OHLC from Dhan API"
          >
            {isFetching ? (
              <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            {isFetching ? 'Fetching…' : 'Fetch OHLC'}
          </button>
        )}
        <button
          onClick={onInsertStructureEvent}
          className="text-[11px] px-2.5 py-1 rounded-lg border bg-surface-700/60 border-surface-500/50 text-gray-400 hover:text-gray-200 hover:bg-surface-600/60 transition-colors flex items-center gap-1.5"
          title="Insert a structure event below this row"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Structure Event
        </button>
        {entry.row_type === 'structure_event' && (
          <button
            onClick={onDeleteEntry}
            className="text-[11px] px-2 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete this structure event"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
