import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../store/appStore';
import { useSwingPlan } from '../../hooks/useSwingPlan';
import { useLanguage } from '../../hooks/useLanguage';
import {
  TIMEFRAMES, TIMEFRAME_COLORS,
  STOCK_PLAN_BIAS_COLORS, BEHAVIOR_TAGS,
  DAY_PLAN_STATUSES, DAY_PLAN_STATUS_COLORS,
  deriveBehaviorTag, formatDate,
} from '../../../shared/constants';
import StyledDatePicker from '../shared/StyledDatePicker';
import SwingPlanScreenshotUploader from './SwingPlanScreenshotUploader';

// Editable detail page for one swing_plan. Auto-saves on blur / change.
// Defaults to locked (view-only) to prevent accidental edits.
export default function SwingPlanDetail({ planId, onBack }) {
  const { symbols, showNotification } = useApp();
  const { getById, updateNumbers, updateExecution, deletePlan, getScreenshots } = useSwingPlan();
  const { t } = useLanguage();

  const [plan, setPlan]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [locked, setLocked]     = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [setupShots, setSetupShots]       = useState([]);
  const [outcomeShots, setOutcomeShots]   = useState([]);

  // Editable local state
  const [symbolId, setSymbolId]       = useState('');
  const [planDate, setPlanDate]       = useState('');
  const [timeframe, setTimeframe]     = useState('Daily');
  const [entryPrice, setEntryPrice]   = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [stopLoss, setStopLoss]       = useState('');
  const [analysis, setAnalysis]       = useState('');
  const [execStatus, setExecStatus]     = useState('Waiting');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [outcomeSaving, setOutcomeSaving] = useState(false);
  const [outcomeSaved, setOutcomeSaved]   = useState(false);
  const savedTimerRef = useRef(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const p = await getById(planId);
    if (p) {
      setPlan(p);
      setSymbolId(p.symbol_id);
      setPlanDate(p.plan_date);
      setTimeframe(p.timeframe);
      setEntryPrice(p.entry_price ?? '');
      setTargetPrice(p.target_price ?? '');
      setStopLoss(p.stop_loss ?? '');
      setAnalysis(p.analysis || '');
      setExecStatus(p.execution_status || 'Waiting');
      setOutcomeNotes(p.outcome_notes || '');
    }
    const [setup, outcome] = await Promise.all([
      getScreenshots(planId, 'setup'),
      getScreenshots(planId, 'outcome'),
    ]);
    setSetupShots(setup || []);
    setOutcomeShots(outcome || []);
    setLoading(false);
  }, [planId, getById, getScreenshots]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const persistNumbers = async () => {
    if (locked) return;
    try {
      await updateNumbers(planId, {
        symbolId: Number(symbolId),
        planDate,
        timeframe,
        entryPrice:  toNum(entryPrice),
        targetPrice: toNum(targetPrice),
        stopLoss:    toNum(stopLoss),
        analysis:    analysis.trim() || null,
      });
    } catch (err) {
      showNotification(err.message || 'Failed to save', 'error');
    }
  };

  const persistExecution = async (status, notes) => {
    try {
      await updateExecution(planId, { executionStatus: status, outcomeNotes: notes });
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      setOutcomeSaved(true);
      savedTimerRef.current = setTimeout(() => setOutcomeSaved(false), 2500);
    } catch (err) {
      showNotification(err.message || 'Failed to save outcome', 'error');
    }
  };

  const handleStatusChange = async (s) => {
    setExecStatus(s);
    await persistExecution(s, outcomeNotes);
  };

  const handleSaveOutcome = async () => {
    setOutcomeSaving(true);
    await persistExecution(execStatus, outcomeNotes);
    setOutcomeSaving(false);
  };

  const handleDelete = async () => {
    try {
      await deletePlan(planId);
      showNotification('Swing plan deleted', 'info');
      onBack();
    } catch (err) {
      showNotification('Failed to delete', 'error');
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Plan not found</p>
        <button onClick={onBack} className="btn-secondary mt-4">Go Back</button>
      </div>
    );
  }

  const biasColors  = STOCK_PLAN_BIAS_COLORS[plan.bias];
  const tag         = deriveBehaviorTag(plan.bias, plan.behavior_tag);
  const tagColors   = tag && tag !== plan.bias ? BEHAVIOR_TAGS[tag] : null;
  const tfColors    = TIMEFRAME_COLORS[timeframe] || { bg: 'bg-surface-600', text: 'text-gray-400', border: 'border-surface-500' };
  const execColors  = DAY_PLAN_STATUS_COLORS[execStatus] || DAY_PLAN_STATUS_COLORS['Waiting'];
  const symbolName  = symbols.find((s) => s.id === Number(symbolId))?.name || plan.symbol_name;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('back')}
        </button>

        {/* Right-side controls */}
        <div className="flex items-center gap-2">
          {/* Edit Lock toggle */}
          <button
            onClick={() => setLocked((l) => !l)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${
              locked
                ? 'bg-surface-700 border-surface-500/60 text-gray-400 hover:text-gray-200 hover:border-surface-400'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            {locked ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path strokeLinecap="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                View Mode
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editing
              </>
            )}
          </button>

          {/* Delete */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {t('delete')}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-surface-700 border border-surface-500 rounded-lg px-2 py-1">
              <span className="text-[11px] text-gray-300">{t('delete')}?</span>
              <button onClick={handleDelete} className="text-[11px] px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded transition-colors">{t('yes')}</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[11px] px-2 py-0.5 bg-surface-600 hover:bg-surface-500 text-gray-300 rounded transition-colors">{t('no')}</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Identity card (template snapshot) ── */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">From Template</p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <h2 className="text-base font-semibold text-gray-200 truncate">{plan.name}</h2>
              {biasColors && (
                <span className={`text-[10px] px-2 py-0.5 rounded ${biasColors.bg} ${biasColors.text} ${biasColors.border} border`}>
                  {plan.bias}
                </span>
              )}
              {tagColors && (
                <span className={`text-[10px] px-2 py-0.5 rounded ${tagColors.bg} ${tagColors.text} ${tagColors.border} border`}>
                  {tag}
                </span>
              )}
              {plan.group_name && (
                <span className="text-[10px] text-gray-500">{plan.group_name}</span>
              )}
            </div>
          </div>
          <span className={`text-[11px] px-2.5 py-1 rounded ${execColors.bg} ${execColors.text} ${execColors.border} border font-medium`}>
            {execStatus}
          </span>
        </div>
        {plan.description && (
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">{plan.description}</p>
        )}
      </div>

      {/* ── Setup card (editable when unlocked) ── */}
      <div className="glass-card p-4 space-y-4">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Setup</h3>

        {/* Symbol + Plan Date + Timeframe */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Symbol</Label>
            <select
              value={symbolId}
              onChange={(e) => { setSymbolId(e.target.value); }}
              onBlur={persistNumbers}
              disabled={locked}
              className="input-field text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {symbols.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Plan Date</Label>
            <StyledDatePicker
              value={planDate}
              onChange={(d) => { setPlanDate(d); persistNumbers(); }}
              disabled={locked}
            />
          </div>
          <div>
            <Label>Timeframe</Label>
            <div className="flex flex-wrap gap-1.5">
              {TIMEFRAMES.map((tf) => {
                const c = TIMEFRAME_COLORS[tf];
                const active = timeframe === tf;
                return (
                  <button
                    key={tf}
                    disabled={locked}
                    onClick={() => { setTimeframe(tf); setTimeout(persistNumbers, 0); }}
                    className={`text-[11px] px-2 py-1 rounded border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      active
                        ? `${c.bg} ${c.text} ${c.border} font-medium`
                        : 'bg-surface-800 border-surface-600 text-gray-400 hover:border-surface-500'
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Entry / Target / Stop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Entry Price</Label>
            <input
              type="number" step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              onBlur={persistNumbers}
              disabled={locked}
              placeholder="Entry"
              className="input-field text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <Label>Target</Label>
            <input
              type="number" step="any"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              onBlur={persistNumbers}
              disabled={locked}
              placeholder="Target"
              className="input-field text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <Label>Stop Loss</Label>
            <input
              type="number" step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              onBlur={persistNumbers}
              disabled={locked}
              placeholder="Stop"
              className="input-field text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Analysis */}
        <div>
          <Label>Analysis</Label>
          <textarea
            value={analysis}
            onChange={(e) => setAnalysis(e.target.value)}
            onBlur={persistNumbers}
            disabled={locked}
            rows={3}
            placeholder="Stock-specific narrative — pattern context, supporting levels, …"
            className="input-field text-sm w-full resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Setup screenshots */}
        <SwingPlanScreenshotUploader
          swingPlanId={plan.id}
          screenshots={setupShots}
          symbolName={symbolName}
          planDate={planDate}
          onRefresh={async () => {
            const s = await getScreenshots(plan.id, 'setup');
            setSetupShots(s || []);
          }}
          kind="setup"
          label="Setup Screenshots"
          disabled={locked}
        />
      </div>

      {/* ── Outcome card (post-trade) ── */}
      <div className="glass-card p-4 space-y-4">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Outcome</h3>

        <div>
          <Label>Execution Status</Label>
          <div className="flex flex-wrap gap-1.5">
            {DAY_PLAN_STATUSES.map((s) => {
              const c = DAY_PLAN_STATUS_COLORS[s];
              const active = execStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${
                    active
                      ? `${c.bg} ${c.text} ${c.border} font-medium`
                      : 'bg-surface-800 border-surface-600 text-gray-400 hover:border-surface-500'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Outcome Notes</Label>
          <textarea
            value={outcomeNotes}
            onChange={(e) => setOutcomeNotes(e.target.value)}
            rows={3}
            placeholder="What happened on this trade? Exit reason, observations…"
            className="input-field text-sm w-full resize-none"
          />
        </div>

        {/* Save Outcome button */}
        <button
          onClick={handleSaveOutcome}
          disabled={outcomeSaving}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed ${
            outcomeSaved
              ? 'bg-emerald-600/80 text-white border border-emerald-500/50'
              : 'bg-primary-600 hover:bg-primary-500 text-white border border-primary-500/40 disabled:opacity-50'
          }`}
        >
          {outcomeSaving ? 'Saving…' : outcomeSaved ? '✓ Outcome Saved' : 'Save Outcome'}
        </button>

        {/* Outcome screenshots */}
        <SwingPlanScreenshotUploader
          swingPlanId={plan.id}
          screenshots={outcomeShots}
          symbolName={symbolName}
          planDate={planDate}
          onRefresh={async () => {
            const s = await getScreenshots(plan.id, 'outcome');
            setOutcomeShots(s || []);
          }}
          kind="outcome"
          label="Outcome Screenshots"
        />
      </div>

      <p className="text-[10px] text-gray-600 italic text-center">
        Plan created {plan.created_at ? formatDate(plan.created_at.slice(0, 10)) : '—'} · outcome always editable · unlock setup to edit setup fields
      </p>
    </div>
  );
}

function Label({ children }) {
  return (
    <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">
      {children}
    </span>
  );
}

function toNum(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
