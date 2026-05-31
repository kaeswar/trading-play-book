import React from 'react';
import DayPlanManagement from './DayPlanManagement';
import ExportView from './ExportView';
import SymbolsView from './SymbolsView';
import BackupView from './BackupView';

const COMPONENTS = {
  dayPlan: DayPlanManagement,
  export:  ExportView,
  symbols: SymbolsView,
  backup:  BackupView,
};

const LABELS = {
  dayPlan: 'Plan - Day Change',
  export:  'Export',
  symbols: 'Symbols',
  backup:  'Backup / Restore',
};

const NO_HEADING = new Set(['export', 'backup']);

export default function SettingsView({ selected }) {
  const Component = COMPONENTS[selected];
  const label = LABELS[selected];

  if (!Component) {
    return <p className="text-sm text-gray-600">Select an item from the sidebar.</p>;
  }

  return (
    <div>
      {!NO_HEADING.has(selected) && (
        <h3 className="text-sm font-semibold text-gray-300 mb-4 pb-2 border-b border-surface-600/40">
          {label}
        </h3>
      )}
      <Component />
    </div>
  );
}
