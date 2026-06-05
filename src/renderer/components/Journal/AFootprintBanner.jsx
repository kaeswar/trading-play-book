import React from 'react';
import { fmt } from './journalConstants';

function acceptanceVerdict(level, ph, pl) {
  if (level == null || ph == null || pl == null) return null;
  if (parseFloat(pl) > parseFloat(level)) return 'above';
  if (parseFloat(ph) < parseFloat(level)) return 'below';
  return 'at';
}

function AcceptanceChip({ verdict }) {
  if (!verdict) return <span className="text-[10px] text-gray-500">—</span>;
  const map = {
    above: { label: 'Above', color: '#7ab8e8', bg: '#0d1e2e', border: '#1e3a55' },
    below: { label: 'Below', color: '#e07070', bg: '#2a0d1a', border: '#4a1530' },
    at:    { label: 'At',    color: '#e8c97a', bg: '#1e1a0a', border: '#3a3010' },
  };
  const s = map[verdict];
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded border font-semibold"
      style={{ background: s.bg, borderColor: s.border, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export default function AFootprintBanner({ session, draft }) {
  const { a_vah, a_poc, a_val } = session;
  const ph = draft.period_high  != null ? parseFloat(draft.period_high)  : null;
  const pl = draft.period_low   != null ? parseFloat(draft.period_low)   : null;
  const pc = draft.period_close != null ? parseFloat(draft.period_close) : null;

  const vahVerdict = acceptanceVerdict(a_vah, ph, pl);
  const pocVerdict = acceptanceVerdict(a_poc, ph, pl);
  const valVerdict = acceptanceVerdict(a_val, ph, pl);

  // Overall verdict based on close — where price actually accepted/settled
  let verdict = null;
  let verdictStyle = null;
  if (pc != null && a_vah != null && pc > parseFloat(a_vah)) {
    verdict = 'Accepting above A-VAH';
    verdictStyle = { color: '#4ade80', arrow: 'up', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.25)' };
  } else if (pc != null && a_val != null && pc < parseFloat(a_val)) {
    verdict = 'Accepting below A-VAL';
    verdictStyle = { color: '#f87171', arrow: 'down', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)' };
  } else if (pc != null && a_vah != null && a_val != null) {
    verdict = 'Trading within A footprint';
    verdictStyle = { color: '#fbbf24', arrow: null, bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.2)' };
  }

  return (
    <div
      className="rounded-lg border mb-4 overflow-hidden"
      style={{ background: '#0d1520', borderColor: '#1a2d40' }}
    >
      <div className="flex items-center gap-1 px-3 py-1.5 border-b" style={{ borderColor: '#1a2d40' }}>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#4a7fa8' }}>
          A-Period Footprint Reference
        </span>
      </div>
      <div className="flex items-center gap-5 px-3 py-2">
        {[['A-VAH', a_vah, vahVerdict, '#4ade80'], ['A-POC', a_poc, pocVerdict, '#fbbf24'], ['A-VAL', a_val, valVerdict, '#f87171']].map(([label, val, verd, clr]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</span>
            <span className="text-xs font-bold" style={{ color: clr }}>{fmt(val)}</span>
            <AcceptanceChip verdict={verd} />
          </div>
        ))}
      </div>
      {verdict && verdictStyle && (
        <div
          className="px-3 py-1.5 border-t flex items-center justify-between"
          style={{ borderColor: verdictStyle.border, background: verdictStyle.bg }}
        >
          <span className="text-[10px] text-gray-500">
            Range: {ph != null && pl != null ? parseFloat((ph - pl).toFixed(2)) : '—'}
          </span>
          <div className="flex items-center gap-1.5">
            {verdictStyle.arrow === 'up' && (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" style={{ color: verdictStyle.color }}>
                <path d="M12 4l8 8h-5v8H9v-8H4l8-8z" />
              </svg>
            )}
            {verdictStyle.arrow === 'down' && (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" style={{ color: verdictStyle.color }}>
                <path d="M12 20l-8-8h5V4h6v8h5l-8 8z" />
              </svg>
            )}
            <span className="text-[10px] font-semibold" style={{ color: verdictStyle.color }}>{verdict}</span>
          </div>
        </div>
      )}
    </div>
  );
}
