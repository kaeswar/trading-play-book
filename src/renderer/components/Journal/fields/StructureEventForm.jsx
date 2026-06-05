import React from 'react';
import { STRUCTURE_EVENT_TYPES, ACCEPTANCE } from '../journalConstants';
import ObservationField from './ObservationField';
import BiasPicker from './BiasPicker';
import BiasTriggerField from './BiasTriggerField';

export default function StructureEventForm({ draft, onChange }) {
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="w-44">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Event Type</label>
          <select
            value={draft.structure_event_type ?? ''}
            onChange={e => onChange('structure_event_type', e.target.value)}

            className="input-field text-sm w-full"
          >
            <option value="">— select —</option>
            {STRUCTURE_EVENT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="w-24">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Price Ref</label>
          <input
            type="number"
            step="0.5"
            value={draft.price_reference ?? ''}
            onChange={e => onChange('price_reference', e.target.value)}

            placeholder="0.00"
            className="input-field text-sm w-full text-amber-400"
          />
        </div>
        <div className="w-36">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Acceptance</label>
          <select
            value={draft.acceptance ?? ''}
            onChange={e => onChange('acceptance', e.target.value)}

            className="input-field text-sm w-full"
          >
            <option value="">— select —</option>
            {ACCEPTANCE.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <ObservationField draft={draft} onChange={onChange} />
      <BiasPicker draft={draft} onChange={onChange} />
      <BiasTriggerField draft={draft} onChange={onChange} />
    </div>
  );
}
