import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../store/appStore';
import { useLanguage } from '../../hooks/useLanguage';
import { useDayPlan } from '../../hooks/useDayPlan';
import {
  STOCK_PLAN_BIAS_COLORS, BEHAVIOR_TAGS, DAY_PLAN_STATUS_COLORS,
  deriveBehaviorTag,
} from '../../../shared/constants';
import DayPlanScreenshotUploader from './DayPlanScreenshotUploader';

// Pre-market editing card. Only Target + Stop-Out + Screenshots are editable here.
// Intraday notes live in the Plan Analysis view. Execution status + outcome notes
// live in the Post-Market "Update Day's Result" view.
export default function DayPlanCard({ dayPlan, tradingDay, symbolName, isLastPlan, expandedOverride, onChange, onDayDeleted }) {
  const { updateNumbers, deletePlan, getScreenshots } = useDayPlan();
  const { showNotification } = useApp();
  const { t } = useLanguage();

  const [expanded, setExpanded]       = useState(false);

  useEffect(() => {
    if (expandedOverride !== undefined) setExpanded(expandedOverride);
  }, [expandedOverride]);
  const [target, setTarget]           = useState(dayPlan.target ?? '');
  const [stopOut, setStopOut]         = useState(dayPlan.stop_out ?? '');
  const [screenshots, setScreenshots] = useState([]);

  useEffect(() => {
    setTarget(dayPlan.target ?? '');
    setStopOut(dayPlan.stop_out ?? '');
  }, [dayPlan]);

  const loadScreenshots = useCallback(async () => {
    const list = await getScreenshots(dayPlan.id, 'setup');
    setScreenshots(list);
  }, [dayPlan.id, getScreenshots]);

  useEffect(() => { loadScreenshots(); }, [loadScreenshots]);

  const persistNumbers = async () => {
    try {
      await updateNumbers(dayPlan.id, { target: toNum(target), stopOut: toNum(stopOut) });
      if (onChange) onChange();
    } catch (err) {
      showNotification('Failed to save numbers', 'error');
    }
  };

  const handleDelete = async () => {
    // If this is the only plan for the day, deleting it removes the entire trading day.
    const confirmMsg = isLastPlan ? t('deleteLastPlanConfirm') : t('deleteDayPlan');
    if (!window.confirm(confirmMsg)) return;
    try {
      if (isLastPlan && tradingDay?.id) {
        // Drop the whole trading_day → cascades to day_plan / day_plan_screenshot / intraday_note.
        await window.api.tradingDay.delete(tradingDay.id);
        showNotification('Trading day removed', 'info');
        if (onDayDeleted) onDayDeleted();
      } else {
        await deletePlan(dayPlan.id);
        showNotification('Plan removed', 'info');
        if (onChange) onChange();
      }
    } catch (err) {
      showNotification('Failed to delete', 'error');
    }
  };

  const biasColors  = STOCK_PLAN_BIAS_COLORS[dayPlan.bias];
  const tag         = deriveBehaviorTag(dayPlan.bias, dayPlan.behavior_tag);
  const tagColors   = tag && tag !== dayPlan.bias ? BEHAVIOR_TAGS[tag] : null;
  const execColors  = dayPlan.execution_status && dayPlan.execution_status !== 'Waiting'
    ? DAY_PLAN_STATUS_COLORS[dayPlan.execution_status]
    : null;

  const accentGradient = dayPlan.bias && dayPlan.bias.includes('Bullish')
    ? 'from-blue-500 to-cyan-500'
    : dayPlan.bias && dayPlan.bias.includes('Bearish')
      ? 'from-red-500 to-orange-500'
      : 'from-slate-500 to-slate-400';

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-700/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-1.5 h-8 rounded-full bg-gradient-to-b ${accentGradient} flex-shrink-0`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-200 truncate">{dayPlan.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {dayPlan.group_name && (
                <span className="text-[10px] text-gray-500 truncate">{dayPlan.group_name}</span>
              )}
              {biasColors && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${biasColors.bg} ${biasColors.text} ${biasColors.border} border`}>
                  {dayPlan.bias}
                </span>
              )}
              {tagColors && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${tagColors.bg} ${tagColors.text} ${tagColors.border} border`}>
                  {tag}
                </span>
              )}
              {execColors && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${execColors.bg} ${execColors.text} ${execColors.border} border`}>
                  {dayPlan.execution_status}
                </span>
              )}
            </div>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-surface-600/30">
          {/* Target + Stop-out */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase mb-0.5 block">{t('target')}</label>
              <input
                type="number"
                step="any"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                onBlur={persistNumbers}
                placeholder="Target"
                className="input-field text-sm w-full"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase mb-0.5 block">{t('stopOut')}</label>
              <input
                type="number"
                step="any"
                value={stopOut}
                onChange={(e) => setStopOut(e.target.value)}
                onBlur={persistNumbers}
                placeholder="Stop"
                className="input-field text-sm w-full"
              />
            </div>
          </div>

          {/* Setup Screenshots */}
          <DayPlanScreenshotUploader
            dayPlanId={dayPlan.id}
            screenshots={screenshots}
            tradingDay={tradingDay}
            onRefresh={loadScreenshots}
            kind="setup"
            label="Setup Screenshots"
          />

          {/* Delete row */}
          <div className="flex items-center justify-end pt-2 border-t border-surface-600/30">
            <button
              onClick={handleDelete}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {t('delete')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function toNum(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
