import React from 'react';

export default function BiasTriggerField({ draft, onChange }) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Bias Trigger</label>
      <input
        type="text"
        value={draft.bias_trigger ?? ''}
        onChange={e => onChange('bias_trigger', e.target.value)}
        placeholder="One-line reason for this bias…"
        className="input-field text-sm w-full"
      />
    </div>
  );
}
