import React from 'react';
import { fmt } from '../journalConstants';

const ArrowUp = ({ color }) => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color }}>
    <path d="M12 4l8 8h-5v8H9v-8H4l8-8z" />
  </svg>
);

const ArrowDown = ({ color }) => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color }}>
    <path d="M12 20l-8-8h5V4h6v8h5l-8 8z" />
  </svg>
);

const ArrowRight = ({ color }) => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color }}>
    <path d="M4 11h12.17l-4.59-4.59L13 5l7 7-7 7-1.41-1.41L17.17 13H4v-2z" />
  </svg>
);

export default function VaMigrationFields({ draft, prevHigh, prevLow }) {
  const pc = draft.period_close != null ? parseFloat(draft.period_close) : null;

  const hasPrev   = prevHigh != null && prevLow != null;
  const hb        = hasPrev ? (parseFloat(prevHigh) + parseFloat(prevLow)) / 2 : null;
  const prevRange = hasPrev ? parseFloat(prevHigh) - parseFloat(prevLow) : 0;
  const tol       = prevRange > 0 ? prevRange * 0.05 : 0; // 5% of prev period range as "at" buffer

  let verdict, subtext, color, Arrow;

  if (pc == null || hb == null) {
    verdict = null;
  } else if (pc > hb + tol) {
    verdict = 'Above Prev H.B';  subtext = 'Buyers Visible';  color = '#4ade80'; Arrow = ArrowUp;
  } else if (pc < hb - tol) {
    verdict = 'Below Prev H.B';  subtext = 'Sellers Visible'; color = '#f87171'; Arrow = ArrowDown;
  } else {
    verdict = 'At Prev H.B';     subtext = 'In-Decision';     color = '#fbbf24'; Arrow = ArrowRight;
  }

  return (
    <div className="min-w-[130px]">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Half Back</p>

      {verdict ? (
        <div className="flex items-center gap-1.5">
          <Arrow color={color} />
          <div>
            <p className="text-[11px] font-semibold leading-tight" style={{ color }}>{verdict}</p>
            <p className="text-[10px] leading-tight" style={{ color: `${color}99` }}>{subtext}</p>
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-gray-600 italic">
          {hasPrev ? 'Fetch close to compute' : 'No previous period data'}
        </p>
      )}

      {hb != null && (
        <p className="text-[9px] text-gray-600 mt-1">H.B = {fmt(hb)}</p>
      )}
    </div>
  );
}
