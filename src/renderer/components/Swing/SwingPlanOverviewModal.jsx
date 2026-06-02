import React, { useState, useEffect } from 'react';
import { useSwingPlan } from '../../hooks/useSwingPlan';
import {
  TIMEFRAME_COLORS, STOCK_PLAN_BIAS_COLORS, BEHAVIOR_TAGS,
  DAY_PLAN_STATUS_COLORS, deriveBehaviorTag, formatDate,
} from '../../../shared/constants';

// plans: full filtered list from gallery
// initialIndex: index of the plan that was clicked
export default function SwingPlanOverviewModal({ plans, initialIndex, onClose, onEdit }) {
  const { getById, getScreenshots } = useSwingPlan();
  const [idx, setIdx]                   = useState(initialIndex);
  const [plan, setPlan]                 = useState(null);
  const [setupShots, setSetupShots]     = useState([]);
  const [outcomeShots, setOutcomeShots] = useState([]);
  const [loading, setLoading]           = useState(true);

  const total   = plans.length;
  const planId  = plans[idx]?.id;

  useEffect(() => {
    if (!planId) return;
    setLoading(true);
    setPlan(null);
    setSetupShots([]);
    setOutcomeShots([]);
    async function load() {
      const p = await getById(planId);
      setPlan(p);
      const [s, o] = await Promise.all([
        getScreenshots(planId, 'setup'),
        getScreenshots(planId, 'outcome'),
      ]);
      setSetupShots(s || []);
      setOutcomeShots(o || []);
      setLoading(false);
    }
    load();
  }, [planId]);

  // Keyboard: Escape = close, ArrowLeft = prev, ArrowRight = next
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape')      onClose();
      if (e.key === 'ArrowLeft'  && idx > 0)          setIdx((i) => i - 1);
      if (e.key === 'ArrowRight' && idx < total - 1)  setIdx((i) => i + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, idx, total]);

  const biasColors = plan ? STOCK_PLAN_BIAS_COLORS[plan.bias] : null;
  const tag        = plan ? deriveBehaviorTag(plan.bias, plan.behavior_tag) : null;
  const tagColors  = tag && plan && tag !== plan.bias ? BEHAVIOR_TAGS[tag] : null;
  const tfColors   = plan
    ? (TIMEFRAME_COLORS[plan.timeframe] || { bg: 'bg-surface-600', text: 'text-gray-400', border: 'border-surface-500' })
    : null;
  const execColors = plan
    ? (DAY_PLAN_STATUS_COLORS[plan.execution_status] || DAY_PLAN_STATUS_COLORS['Waiting'])
    : null;
  const fmt = (v) => v != null ? Number(v).toLocaleString('en-IN') : '—';

  return (
    <div className="fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-900 w-full h-full overflow-hidden flex flex-col">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-600/50 shrink-0">
          {/* Left: back */}
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Gallery
          </button>

          {/* Centre: Prev · counter · Next */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIdx((i) => i - 1)}
              disabled={idx === 0}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-surface-600 bg-surface-700 hover:bg-surface-600 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </button>

            <span className="text-xs text-gray-500 w-14 text-center tabular-nums">
              {idx + 1} / {total}
            </span>

            <button
              onClick={() => setIdx((i) => i + 1)}
              disabled={idx === total - 1}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-surface-600 bg-surface-700 hover:bg-surface-600 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Right: edit */}
          <button
            onClick={() => onEdit(planId)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary-600/80 hover:bg-primary-500 text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Plan
          </button>
        </div>

        {/* ── Loading state ── */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        )}

        {/* ── Plan content ── */}
        {!loading && plan && (
          <>
            {/* Plan identity header */}
            <div className="px-5 py-4 border-b border-surface-600/30 shrink-0 space-y-2.5">

              {/* Row 1: Symbol · chips · Status */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-2xl font-bold text-gray-100 tracking-tight">{plan.symbol_name}</span>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded ${tfColors.bg} ${tfColors.text} ${tfColors.border} border font-medium`}>
                    {plan.timeframe}
                  </span>
                  {biasColors && (
                    <span className={`text-[11px] px-2.5 py-0.5 rounded ${biasColors.bg} ${biasColors.text} ${biasColors.border} border`}>
                      {plan.bias}
                    </span>
                  )}
                  {tagColors && (
                    <span className={`text-[11px] px-2.5 py-0.5 rounded ${tagColors.bg} ${tagColors.text} ${tagColors.border} border`}>
                      {tag}
                    </span>
                  )}
                </div>
                <span className={`text-sm px-3.5 py-1 rounded-lg ${execColors.bg} ${execColors.text} ${execColors.border} border font-semibold`}>
                  {plan.execution_status}
                </span>
              </div>

              {/* Row 2: Plan name · group · date */}
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="text-gray-300 font-medium">{plan.name}</span>
                {plan.group_name && <span className="text-gray-500">· {plan.group_name}</span>}
                <span className="text-gray-500">· {formatDate(plan.plan_date)}</span>
              </div>

              {/* Row 3: Price strip */}
              <div className="flex items-center gap-5 flex-wrap">
                <PriceBlock label="Entry"    value={fmt(plan.entry_price)}  color="text-gray-200" />
                <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <PriceBlock label="Target"   value={fmt(plan.target_price)} color="text-emerald-400" />
                <div className="w-px h-5 bg-surface-600" />
                <PriceBlock label="Stop Out" value={fmt(plan.stop_loss)}    color="text-red-400" />
              </div>
            </div>

            {/* Two-column screenshots */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 divide-x divide-surface-600/40 h-full">
                <ScreenshotColumn
                  title="Setup"
                  accentClass="text-sky-400"
                  shots={setupShots}
                  note={plan.analysis}
                  noteLabel="Analysis"
                  emptyMsg="No setup screenshots"
                />
                <ScreenshotColumn
                  title="Outcome"
                  accentClass="text-emerald-400"
                  shots={outcomeShots}
                  note={plan.outcome_notes}
                  noteLabel="Outcome Notes"
                  emptyMsg="No outcome screenshots"
                />
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

function PriceBlock({ label, value, color }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <span className={`text-base font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function ScreenshotColumn({ title, accentClass, shots, note, noteLabel, emptyMsg }) {
  return (
    <div className="p-5 space-y-4">
      <h4 className={`text-xs font-bold uppercase tracking-widest ${accentClass}`}>{title}</h4>

      {shots.length === 0 ? (
        <div className="border border-dashed border-surface-600/50 rounded-xl p-8 flex items-center justify-center">
          <p className="text-xs text-gray-600">{emptyMsg}</p>
        </div>
      ) : (
        <div className={`grid gap-2 ${shots.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {shots.map((ss) => (
            <ScreenshotTile key={ss.id} filePath={ss.file_path} />
          ))}
        </div>
      )}

      {note ? (
        <div className="space-y-1">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{noteLabel}</p>
          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{note}</p>
        </div>
      ) : (
        <p className="text-xs text-gray-600 italic">No {noteLabel.toLowerCase()} recorded</p>
      )}
    </div>
  );
}

function ScreenshotTile({ filePath }) {
  const [src, setSrc]       = React.useState(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    window.api.image.getFullPath(filePath).then(async (fullPath) => {
      if (!fullPath) return;
      const dataUrl = await window.api.image.toDataUrl(fullPath);
      if (dataUrl) setSrc(dataUrl);
    });
  }, [filePath]);

  return (
    <button
      onClick={() => window.api.image.openViewer(filePath)}
      className="w-full aspect-video rounded-xl overflow-hidden border border-surface-600/50 hover:border-primary-500/60 transition-all bg-surface-800 group"
    >
      {src ? (
        <img
          src={src}
          alt="Screenshot"
          className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.02] ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <div className="w-full h-full bg-surface-700 animate-pulse" />
      )}
    </button>
  );
}
