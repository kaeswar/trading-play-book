import React, { useState, useEffect, useCallback } from 'react';
import {
  STOCK_PLAN_BIAS_COLORS, BEHAVIOR_TAGS, DAY_PLAN_STATUS_COLORS,
  INTRADAY_STATUS_COLORS, deriveBehaviorTag,
} from '../../../shared/constants';

// Maximized full-picture view of a day's plans. Navigation lets the user step through
// each plan without closing the modal.
// Props:
//   dayPlans  — full array of plans for the day
//   initialId — id of the plan to show first (defaults to first in list)
export default function PlanFullViewModal({ dayPlans, initialId, onClose }) {
  const plans = dayPlans || [];
  const initialIndex = Math.max(0, plans.findIndex(p => p.id === initialId));
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const dayPlan = plans[currentIndex];

  const [setupShots, setSetupShots]     = useState([]);
  const [outcomeShots, setOutcomeShots] = useState([]);
  const [notes, setNotes]               = useState([]);
  const [loading, setLoading]           = useState(true);

  const loadAll = useCallback(async () => {
    if (!dayPlan) return;
    setLoading(true);
    const [setup, outcome, n] = await Promise.all([
      window.api.dayPlanScreenshot.getByDayPlan(dayPlan.id, 'setup'),
      window.api.dayPlanScreenshot.getByDayPlan(dayPlan.id, 'outcome'),
      window.api.intradayNote.getByDayPlan(dayPlan.id),
    ]);
    setSetupShots(setup || []);
    setOutcomeShots(outcome || []);
    setNotes(n || []);
    setLoading(false);
  }, [dayPlan?.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);
  const goNext = useCallback(() => {
    if (currentIndex < plans.length - 1) setCurrentIndex(currentIndex + 1);
  }, [currentIndex, plans.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft')  goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goPrev, goNext]);

  if (!dayPlan) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < plans.length - 1;

  const biasColors = STOCK_PLAN_BIAS_COLORS[dayPlan.bias];
  const tag = deriveBehaviorTag(dayPlan.bias, dayPlan.behavior_tag);
  const tagColors = tag && tag !== dayPlan.bias ? BEHAVIOR_TAGS[tag] : null;
  const execColors = dayPlan.execution_status && dayPlan.execution_status !== 'Waiting'
    ? DAY_PLAN_STATUS_COLORS[dayPlan.execution_status]
    : null;

  const accentGradient = dayPlan.bias && dayPlan.bias.includes('Bullish')
    ? 'from-blue-500 to-cyan-500'
    : dayPlan.bias && dayPlan.bias.includes('Bearish')
      ? 'from-red-500 to-orange-500'
      : 'from-slate-500 to-slate-400';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex" onClick={onClose}>
      <div
        className="w-full h-full bg-surface-900 border border-surface-600/50 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="shrink-0 border-b border-surface-600/40 bg-surface-800/95">
          <div className="px-6 py-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={`w-1.5 h-10 rounded-full bg-gradient-to-b ${accentGradient} flex-shrink-0 mt-0.5`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-gray-100 truncate">{dayPlan.name}</h2>
                  {biasColors && (
                    <span className={`text-[11px] px-2 py-0.5 rounded ${biasColors.bg} ${biasColors.text} ${biasColors.border} border`}>
                      {dayPlan.bias}
                    </span>
                  )}
                  {tagColors && (
                    <span className={`text-[11px] px-2 py-0.5 rounded ${tagColors.bg} ${tagColors.text} ${tagColors.border} border`}>
                      {tag}
                    </span>
                  )}
                  {execColors && (
                    <span className={`text-[11px] px-2 py-0.5 rounded ${execColors.bg} ${execColors.text} ${execColors.border} border font-medium`}>
                      {dayPlan.execution_status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
                  {dayPlan.group_name && <span>{dayPlan.group_name}</span>}
                  {dayPlan.target != null && (
                    <span><span className="text-gray-600 uppercase tracking-wider">Target</span> <span className="text-emerald-400 font-medium ml-1">{dayPlan.target}</span></span>
                  )}
                  {dayPlan.stop_out != null && (
                    <span><span className="text-gray-600 uppercase tracking-wider">Stop</span> <span className="text-red-400 font-medium ml-1">{dayPlan.stop_out}</span></span>
                  )}
                </div>
                {dayPlan.description && (
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed max-w-3xl">{dayPlan.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {plans.length > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    disabled={!hasPrev}
                    title="Previous plan (←)"
                    className="w-8 h-8 rounded-lg bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-xs text-gray-500 tabular-nums min-w-[44px] text-center">
                    {currentIndex + 1} / {plans.length}
                  </span>
                  <button
                    onClick={goNext}
                    disabled={!hasNext}
                    title="Next plan (→)"
                    className="w-8 h-8 rounded-lg bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <span className="w-px h-6 bg-surface-600/50 mx-1" />
                </>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                title="Close (Esc)"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : (
          <>
            {/* ── Body: two screenshot columns ── */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <ScreenshotColumn title="Setup Screenshots" shots={setupShots} emptyMsg="No setup screenshots attached" />
              <div className="w-px bg-surface-600/40 shrink-0" />
              <ScreenshotColumn title="Outcome Screenshots" shots={outcomeShots} emptyMsg="No outcome screenshots attached" />
            </div>

            {/* ── Outcome notes ── */}
            {dayPlan.outcome_notes && (
              <div className="shrink-0 border-t border-surface-600/40 bg-surface-800/40 px-6 py-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Outcome Notes</p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{dayPlan.outcome_notes}</p>
              </div>
            )}

            {/* ── Intraday notes as paragraph stream ── */}
            <div className="shrink-0 border-t border-surface-600/40 bg-surface-800/60 max-h-[28vh] overflow-y-auto">
              <div className="px-6 py-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Intraday Notes</p>
                {notes.length === 0 ? (
                  <p className="text-sm text-gray-600 italic">No intraday notes recorded for this plan.</p>
                ) : (
                  <div className="space-y-1.5">
                    {notes.map((n) => {
                      const statusColors = INTRADAY_STATUS_COLORS[n.status] || INTRADAY_STATUS_COLORS['Not-Known'];
                      return (
                        <p key={n.id} className="text-sm text-gray-300 leading-relaxed">
                          <span className="text-primary-400 font-medium mr-1.5">{n.note_time}</span>
                          <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border mr-2 ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                            {n.status}
                          </span>
                          <span className="whitespace-pre-wrap">{n.action || <span className="text-gray-600 italic">(no action text)</span>}</span>
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ScreenshotColumn({ title, shots, emptyMsg }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 py-2.5 border-b border-surface-600/30 bg-surface-800/40">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{title}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {shots.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
            <svg className="w-12 h-12 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <p className="text-xs">{emptyMsg}</p>
          </div>
        ) : (
          shots.map((ss) => <ScreenshotPanel key={ss.id} filePath={ss.file_path} />)
        )}
      </div>
    </div>
  );
}

function ScreenshotPanel({ filePath }) {
  const [src, setSrc] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    window.api.image.getFullPath(filePath).then(async (fullPath) => {
      if (fullPath) {
        const dataUrl = await window.api.image.toDataUrl(fullPath);
        if (dataUrl) setSrc(dataUrl);
      }
    });
  }, [filePath]);

  return (
    <button
      onClick={() => window.api.image.openViewer(filePath)}
      className="relative group w-full rounded-lg overflow-hidden border border-surface-500/40 hover:border-primary-400/60 transition-all hover:shadow-lg hover:shadow-primary-500/10 block"
      title="Click to open at full size"
    >
      <div className="aspect-video w-full bg-surface-900">
        {src ? (
          <>
            <img
              src={src} alt=""
              className={`w-full h-full object-contain transition-all group-hover:brightness-90 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setLoaded(true)}
              onError={() => setSrc(null)}
            />
            {!loaded && <div className="absolute inset-0 bg-surface-800 animate-pulse" />}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/50 rounded-full p-2.5">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-surface-800 animate-pulse" />
        )}
      </div>
    </button>
  );
}
