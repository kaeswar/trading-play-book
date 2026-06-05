import React from 'react';

export default function PriceRangeFields({ draft, onChange, highLabel = 'Period High', lowLabel = 'Period Low', rangeLabel = 'Range' }) {
  const ph = draft.period_high ?? '';
  const pl = draft.period_low  ?? '';
  const range = (ph !== '' && pl !== '')
    ? parseFloat((parseFloat(ph) - parseFloat(pl)).toFixed(4))
    : null;

  return (
    <div className="grid grid-cols-4 gap-3 max-w-sm">
      <div>
        <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">{highLabel}</label>
        <input
          type="number"
          step="0.5"
          value={ph}
          onChange={e => onChange('period_high', e.target.value)}

          placeholder="0.00"
          className="input-field text-sm w-full text-emerald-400"
        />
      </div>
      <div>
        <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">{lowLabel}</label>
        <input
          type="number"
          step="0.5"
          value={pl}
          onChange={e => onChange('period_low', e.target.value)}

          placeholder="0.00"
          className="input-field text-sm w-full text-red-400"
        />
      </div>
      <div>
        <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Close</label>
        <input
          type="number"
          step="0.5"
          value={draft.period_close ?? ''}
          onChange={e => onChange('period_close', e.target.value)}

          placeholder="0.00"
          className="input-field text-sm w-full text-sky-400"
        />
      </div>
      <div>
        <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">{rangeLabel}</label>
        <div className="input-field text-sm w-full text-gray-400 bg-surface-700/40 cursor-default select-none">
          {range != null ? range : '—'}
        </div>
      </div>
    </div>
  );
}
