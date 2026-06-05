import React from 'react';
import { OTF_SYMPTOMS } from '../journalConstants';

const GROUP_STYLE = {
  bullish:    { label: 'Bullish OTF Signals',  activeBg: '#D5EAF7', activeBdr: '#85B7EB', activeTxt: '#0C447C' },
  bearish:    { label: 'Bearish OTF Signals',  activeBg: '#F5E0F0', activeBdr: '#ED93B1', activeTxt: '#72243E' },
  structural: { label: 'Structural',           activeBg: '#FDE8C8', activeBdr: '#EF9F27', activeTxt: '#633806' },
};

export default function OtfSymptomPicker({ draft, onChange }) {
  const selected = Array.isArray(draft.otf_symptoms) ? draft.otf_symptoms : [];

  const toggle = (key) => {
    const next = selected.includes(key)
      ? selected.filter(k => k !== key)
      : [...selected, key];
    onChange('otf_symptoms', next);
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">OTF Participant Symptoms</p>
      {Object.entries(OTF_SYMPTOMS).map(([group, symptoms]) => {
        const gs = GROUP_STYLE[group];
        return (
          <div key={group}>
            <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1.5">{gs.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {symptoms.map(s => {
                const active = selected.includes(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggle(s.key)}
                    style={active ? { background: gs.activeBg, borderColor: gs.activeBdr, color: gs.activeTxt } : {}}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                      active
                        ? 'font-medium'
                        : 'bg-surface-700/60 border-surface-500/50 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
