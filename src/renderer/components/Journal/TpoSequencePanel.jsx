import React from 'react';
import SessionMetaStrip from './SessionMetaStrip';
import TpoRowList from './TpoRowList';

export default function TpoSequencePanel({
  session, selectedEntry, onSelectEntry,
  navOpen, onToggleNav,
  sessionsOpen, onToggleSessions,
}) {
  if (!session) return null;

  return (
    <div className="w-[220px] flex flex-col h-full border-r border-surface-600/30 bg-surface-800/50 shrink-0">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-surface-600/30 flex items-center justify-between shrink-0">
        <button
          onClick={onToggleNav}
          className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 hover:bg-surface-600 transition-colors"
          title={navOpen ? 'Hide navigation' : 'Show navigation'}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d={navOpen ? 'M11 19l-7-7 7-7M18 19l-7-7 7-7' : 'M13 5l7 7-7 7M6 5l7 7-7 7'} />
          </svg>
        </button>

        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">TPO Sequence</span>

        {/* Show sessions button — only visible when sessions panel is collapsed */}
        {!sessionsOpen && (
          <button
            onClick={onToggleSessions}
            className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 hover:bg-surface-600 transition-colors"
            title="Show sessions"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M6 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Spacer to keep layout balanced when sessions button is hidden */}
        {sessionsOpen && <div className="w-5 h-5" />}
      </div>

      <SessionMetaStrip session={session} />
      <TpoRowList
        entries={session.entries ?? []}
        selectedId={selectedEntry?.id}
        onSelect={onSelectEntry}
      />
    </div>
  );
}
