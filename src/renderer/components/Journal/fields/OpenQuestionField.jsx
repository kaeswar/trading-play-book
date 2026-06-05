import React from 'react';

export default function OpenQuestionField({ draft, onChange }) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Open Question / Hypothesis</label>
      <input
        type="text"
        value={draft.open_question ?? ''}
        onChange={e => onChange('open_question', e.target.value)}
        placeholder="What do I expect in the next period?"
        className="input-field text-sm w-full border-dashed"
      />
    </div>
  );
}
