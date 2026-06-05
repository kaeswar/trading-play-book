import React from 'react';
import { LOCATION_VS_A_FOOTPRINT } from '../journalConstants';

export default function LocationContextFields({ draft, onChange, showAFootprint = false }) {
  if (!showAFootprint) return null;
  return (
    <div className="w-44">
      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Location vs A Footprint</label>
      <select
        value={draft.location_vs_a_footprint ?? ''}
        onChange={e => onChange('location_vs_a_footprint', e.target.value)}
        className="input-field text-sm w-full"
      >
        <option value="">— select —</option>
        {LOCATION_VS_A_FOOTPRINT.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
