import React from 'react';
import { BIAS_OPTIONS, BIAS_DARK } from '../journalConstants';

export default function BiasPicker({ draft, onChange }) {
  const current = draft.bias ?? null;
  return (
    <div>
      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Bias</label>
      <div className="flex gap-2 flex-wrap">
        {BIAS_OPTIONS.map(opt => {
          const active = current === opt.key;
          const s = BIAS_DARK[opt.key];
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange('bias', active ? null : opt.key)}
              style={active
                ? { background: s.bg, borderColor: s.border, color: s.text }
                : { '--hover-border': s.border }}
              className={`flex flex-col items-center px-4 py-2 rounded-lg border font-semibold transition-all ${
                active
                  ? 'shadow-sm'
                  : 'bg-surface-700/40 border-surface-500/40 text-gray-500 hover:text-gray-200 hover:bg-surface-600/50'
              }`}
            >
              <span className="text-[11px] font-bold leading-tight">{opt.label}</span>
              <span className="text-[9px] font-normal leading-tight opacity-80 whitespace-nowrap">{opt.full}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
