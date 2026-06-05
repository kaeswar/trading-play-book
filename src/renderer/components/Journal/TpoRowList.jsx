import React from 'react';
import TpoRowItem from './TpoRowItem';

export const WHOLE_DAY_ENTRY = { id: 'whole_day', row_type: 'whole_day', tpo_label: '∑' };

export default function TpoRowList({ entries, selectedId, onSelect }) {
  const wholeDayActive = selectedId === 'whole_day';

  return (
    <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
      {entries.map(entry => (
        <TpoRowItem
          key={entry.id}
          entry={entry}
          isActive={entry.id === selectedId}
          onClick={() => onSelect(entry)}
        />
      ))}

      {entries.length > 0 && (
        <>
          <div className="mx-1 my-1 border-t" style={{ borderColor: '#1f2937' }} />
          <button
            onClick={() => onSelect(WHOLE_DAY_ENTRY)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors border ${
              wholeDayActive ? '' : 'border-transparent hover:bg-surface-700/50'
            }`}
            style={wholeDayActive
              ? { background: 'rgba(0,119,187,0.15)', borderColor: 'rgba(0,119,187,0.35)' }
              : {}}
          >
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold shrink-0 border"
              style={{
                background:  wholeDayActive ? 'rgba(0,119,187,0.2)' : '#1e2130',
                borderColor: wholeDayActive ? 'rgba(0,119,187,0.5)' : '#2e3348',
                color:       wholeDayActive ? '#7ab8e8' : '#6b7280',
              }}
            >
              ∑
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[11px] font-medium truncate leading-tight ${
                wholeDayActive ? 'text-gray-100' : 'text-gray-500'
              }`}>
                Whole Day
              </p>
            </div>
          </button>
        </>
      )}
    </div>
  );
}
