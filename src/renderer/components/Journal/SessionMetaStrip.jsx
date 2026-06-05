import React from 'react';
import { fmt } from './journalConstants';

function MetaItem({ label, value, valueClass = 'text-gray-300' }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">{label}</p>
      <p className={`text-[11px] font-semibold ${valueClass}`}>{value ?? '—'}</p>
    </div>
  );
}

export default function SessionMetaStrip({ session }) {
  const hasIB = session.ib_high != null || session.ib_low != null;
  const ibRange = session.ib_high != null && session.ib_low != null
    ? fmt(parseFloat((session.ib_high - session.ib_low).toFixed(2)))
    : null;

  return (
    <div className="px-3 pt-2.5 pb-3 border-b border-surface-600/30 space-y-2.5 shrink-0">
      <div className="flex items-start justify-between gap-1">
        <div>
          <p className="text-xs font-bold text-gray-100">{session.session_date}</p>
          <p className="text-[9px] text-gray-600">{session.instrument}</p>
        </div>
        {session.prev_session_type && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-700 border border-surface-500/40 text-gray-500 font-medium leading-none mt-0.5 shrink-0">
            {session.prev_session_type}
          </span>
        )}
      </div>

      {session.opening_price != null && (
        <div className="flex items-center gap-4">
          <MetaItem label="Open" value={fmt(session.opening_price)} valueClass="text-amber-400" />
          {session.gap_type && (
            <MetaItem label="Gap" value={session.gap_type.replace(/_/g, ' ')} />
          )}
        </div>
      )}

      {hasIB && (
        <div className="grid grid-cols-3 gap-1">
          <MetaItem label="IB High" value={fmt(session.ib_high)} valueClass="text-emerald-400" />
          <MetaItem label="IB Low"  value={fmt(session.ib_low)}  valueClass="text-red-400" />
          <MetaItem label="IB Range" value={ibRange}             valueClass="text-amber-400" />
        </div>
      )}
    </div>
  );
}
