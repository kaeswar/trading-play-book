import React from 'react';

export default function FootprintFields({ draft, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-3 max-w-xs">
      {[['a_vah', 'A-VAH', 'text-emerald-400'], ['a_poc', 'A-POC', 'text-amber-400'], ['a_val', 'A-VAL', 'text-red-400']].map(([field, label, color]) => (
        <div key={field}>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</label>
          <input
            type="number"
            step="0.5"
            value={draft[field] ?? ''}
            onChange={e => onChange(field, e.target.value)}
            placeholder="0.00"
            className={`input-field text-sm w-full ${color}`}
          />
        </div>
      ))}
    </div>
  );
}
