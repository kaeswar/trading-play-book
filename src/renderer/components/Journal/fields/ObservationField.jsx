import React from 'react';

export default function ObservationField({ draft, onChange }) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Observation</label>
      <textarea
        value={draft.observation ?? ''}
        onChange={e => onChange('observation', e.target.value)}
        rows={3}
        placeholder="What is the market doing? What story is the profile telling?"
        className="input-field text-sm w-full resize-none"
      />
    </div>
  );
}
