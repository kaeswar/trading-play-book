import React from 'react';

export default function EntryFooter({ isDirty, isSaving, onSave }) {
  return (
    <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-surface-600/30 bg-surface-800/60">
      <div className="flex items-center gap-2 text-[11px] text-gray-500">
        {isSaving ? (
          <>
            <div className="w-3 h-3 border-2 border-primary-500/30 border-t-primary-400 rounded-full animate-spin" />
            Saving…
          </>
        ) : isDirty ? (
          <>
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            Unsaved changes
          </>
        ) : (
          <>
            <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </>
        )}
      </div>
      <button
        onClick={onSave}
        disabled={!isDirty || isSaving}
        className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-all ${
          isDirty && !isSaving
            ? 'text-white'
            : 'bg-surface-600/40 text-gray-600 cursor-default'
        }`}
        style={isDirty && !isSaving ? { background: '#0077BB' } : {}}
      >
        Save Entry
      </button>
    </div>
  );
}
