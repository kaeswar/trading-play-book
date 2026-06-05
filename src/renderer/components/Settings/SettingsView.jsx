import React from 'react';
import DayPlanManagement from './DayPlanManagement';
import ExportView from './ExportView';
import SymbolsView from './SymbolsView';
import BackupView from './BackupView';
import PlanTemplatesView from './PlanTemplatesView';
import BrokerIntegrationView from './BrokerIntegrationView';

const COMPONENTS = {
  planTemplates:     PlanTemplatesView,
  dayPlan:           DayPlanManagement,
  export:            ExportView,
  symbols:           SymbolsView,
  backup:            BackupView,
  brokerIntegration: BrokerIntegrationView,
};

const NO_HEADING = new Set(['export', 'backup', 'planTemplates']);

const CARDS = [
  {
    id:       'planTemplates',
    label:    'Plan Templates',
    sub:      'Build and manage reusable trade plan templates for your strategies',
    icon:     'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    accent:   { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)', icon: '#818cf8', dot: '#6366f1' },
  },
  {
    id:       'symbols',
    label:    'Symbols',
    sub:      'Configure trading instruments, exchange segments and Dhan API mappings',
    icon:     'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z',
    accent:   { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)', icon: '#fbbf24', dot: '#f59e0b' },
  },
  {
    id:       'dayPlan',
    label:    'Plan — Day Change',
    sub:      'Reassign existing plans from one trading day to another without re-entry',
    icon:     'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    accent:   { bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.28)', icon: '#34d399', dot: '#10b981' },
  },
  {
    id:       'export',
    label:    'Export',
    sub:      'Download your intraday and swing trading data as CSV or PDF reports',
    icon:     'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
    accent:   { bg: 'rgba(56,189,248,0.10)', border: 'rgba(56,189,248,0.28)', icon: '#38bdf8', dot: '#0ea5e9' },
  },
  {
    id:       'backup',
    label:    'Backup / Restore',
    sub:      'Export a full database snapshot or restore from a previous backup file',
    icon:     'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
    accent:   { bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.28)', icon: '#a78bfa', dot: '#7c3aed' },
  },
  {
    id:       'brokerIntegration',
    label:    'Broker Integration',
    sub:      'Enter Dhan API credentials to fetch live OHLC data for TPO periods',
    icon:     'M13 10V3L4 14h7v7l9-11h-7z',
    accent:   { bg: 'rgba(251,146,60,0.10)', border: 'rgba(251,146,60,0.28)', icon: '#fb923c', dot: '#ea580c' },
  },
];

function SettingsHub({ onSelect }) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-100">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Choose a section to configure</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {CARDS.map(card => (
          <button
            key={card.id}
            onClick={() => onSelect(card.id)}
            className="group text-left rounded-xl border p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            style={{
              background:   card.accent.bg,
              borderColor:  card.accent.border,
            }}
          >
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
              style={{ background: 'rgba(0,0,0,0.25)', borderColor: card.accent.border }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                style={{ color: card.accent.icon }}>
                <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
              </svg>
            </div>

            {/* Text */}
            <p className="text-sm font-semibold text-gray-100 leading-tight mb-1.5">{card.label}</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">{card.sub}</p>

            {/* Arrow */}
            <div className="mt-4 flex justify-end">
              <svg className="w-4 h-4 text-gray-600 group-hover:translate-x-0.5 transition-transform"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsView({ selected, onSelect }) {
  if (!selected) {
    return <SettingsHub onSelect={onSelect} />;
  }

  const Component = COMPONENTS[selected];
  const card = CARDS.find(c => c.id === selected);

  if (!Component) return null;

  return (
    <div>
      {/* Back breadcrumb — always visible */}
      <button
        onClick={() => onSelect(null)}
        className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-primary-400 transition-colors mb-5 group"
      >
        <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Return to Settings Home
      </button>

      {!NO_HEADING.has(selected) && card && (
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-surface-600/40">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: card.accent.bg, borderColor: card.accent.border }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
              style={{ color: card.accent.icon }}>
              <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-200">{card.label}</h3>
            <p className="text-[11px] text-gray-500 leading-tight">{card.sub}</p>
          </div>
        </div>
      )}
      <Component />
    </div>
  );
}
