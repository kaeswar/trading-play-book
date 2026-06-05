import React from 'react';
import { BIAS_DARK, ROW_TYPE_LABEL } from './journalConstants';

export default function TpoRowItem({ entry, isActive, onClick }) {
  const isStruct  = entry.row_type === 'structure_event';
  const biasTheme = entry.bias ? BIAS_DARK[entry.bias] : null;

  const timeStr = entry.time_from
    ? entry.time_to ? `${entry.time_from}–${entry.time_to}` : entry.time_from
    : '';

  const label = entry.row_type === 'tpo'
    ? `TPO ${entry.tpo_label}`
    : ROW_TYPE_LABEL[entry.row_type] || entry.tpo_label;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors border ${
        isActive ? '' : 'border-transparent hover:bg-surface-700/50'
      }`}
      style={isActive ? { background: 'rgba(0,119,187,0.15)', borderColor: 'rgba(0,119,187,0.35)' } : {}}
    >
      {/* TPO label badge */}
      <div
        className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 border"
        style={isStruct
          ? { background: '#FAD8CC', borderColor: '#712B13', color: '#712B13' }
          : { background: '#1e2130', borderColor: '#2e3348', color: '#a5b4fc' }}
      >
        {entry.tpo_label}
      </div>

      {/* Label + time */}
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] font-medium truncate leading-tight ${isActive ? 'text-gray-100' : 'text-gray-400'}`}>
          {label}
        </p>
        {timeStr && (
          <p className="text-[9px] text-gray-600 truncate leading-tight">{timeStr}</p>
        )}
      </div>

      {/* Bias box */}
      {biasTheme ? (
        <div
          className="shrink-0 rounded flex items-center justify-center border font-bold"
          style={{
            width: '28px', height: '24px', fontSize: '10px',
            background: biasTheme.bg,
            borderColor: biasTheme.border,
            color: biasTheme.text,
          }}
        >
          {biasTheme.label}
        </div>
      ) : (
        <div className="shrink-0 rounded border" style={{ width: '28px', height: '24px', borderColor: '#2a2d3a', background: '#161820' }} />
      )}
    </button>
  );
}
