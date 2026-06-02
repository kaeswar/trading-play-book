import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../store/appStore';
import { useDayPlan } from '../../hooks/useDayPlan';
import { useLanguage } from '../../hooks/useLanguage';
import {
  STOCK_PLAN_BIAS_COLORS, BEHAVIOR_TAGS, DAY_PLAN_STATUSES, DAY_PLAN_STATUS_COLORS,
  formatDate, deriveBehaviorTag,
} from '../../../shared/constants';
import IntradayNotesModal from '../shared/IntradayNotesModal';
import DayPlanScreenshotUploader from '../Phase1/DayPlanScreenshotUploader';

// Editable post-market view. User updates each plan's execution_status + outcome_notes.
export default function VerdictView() {
  const { selectedSymbol, selectedDate, showNotification } = useApp();
  const { getByTradingDay, updateExecution } = useDayPlan();
  const { t } = useLanguage();

  const [tradingDay, setTradingDay] = useState(null);
  const [dayPlans, setDayPlans]     = useState([]);
  const [noteCounts, setNoteCounts] = useState({});
  const [loading, setLoading]       = useState(true);
  const [openModal, setOpenModal]   = useState(null);
  const [allExpanded, setAllExpanded] = useState(false);

  const loadAll = useCallback(async () => {
    if (!selectedSymbol || !selectedDate) return;
    setLoading(true);
    try {
      const day = await window.api.tradingDay.getByDateAndSymbol(selectedDate, selectedSymbol.id);
      if (!day) {
        setTradingDay(null);
        setDayPlans([]);
        setNoteCounts({});
        return;
      }
      setTradingDay(day);
      const [plans, counts] = await Promise.all([
        getByTradingDay(day.id),
        window.api.intradayNote.countByTradingDay(day.id),
      ]);
      setDayPlans(plans);
      setNoteCounts(counts || {});
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol, selectedDate, getByTradingDay]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleStatusChange = async (planId, status) => {
    const plan = dayPlans.find(p => p.id === planId);
    if (!plan) return;
    setDayPlans(prev => prev.map(p => p.id === planId ? { ...p, execution_status: status } : p));
    try {
      await updateExecution(planId, { executionStatus: status, outcomeNotes: plan.outcome_notes });
    } catch (err) {
      showNotification('Failed to update status', 'error');
      await loadAll();
    }
  };

  const handleNotesChange = (planId, notes) => {
    setDayPlans(prev => prev.map(p => p.id === planId ? { ...p, outcome_notes: notes } : p));
  };

  const handleNotesBlur = async (planId) => {
    const plan = dayPlans.find(p => p.id === planId);
    if (!plan) return;
    try {
      await updateExecution(planId, { executionStatus: plan.execution_status, outcomeNotes: plan.outcome_notes });
    } catch (err) {
      showNotification('Failed to save notes', 'error');
    }
  };

  if (!selectedSymbol) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{t('selectSymbol')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!tradingDay) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-gray-500">{t('noTradingPlanFor').replace('{date}', formatDate(selectedDate))}</p>
      </div>
    );
  }

  const successCount = dayPlans.filter(p => p.execution_status === 'Successful').length;
  const failedCount  = dayPlans.filter(p => p.execution_status === 'Failed').length;
  const c2cCount     = dayPlans.filter(p => p.execution_status === 'Cost-to-Cost').length;
  const unplannedCount = dayPlans.filter(p => p.execution_status === 'UnPlanned').length;
  const cancelledCount = dayPlans.filter(p => p.execution_status === 'Cancelled').length;
  const waitingCount = dayPlans.filter(p => !p.execution_status || p.execution_status === 'Waiting').length;

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-gray-200">Update Day's Verdict</h2>
            <p className="text-xs text-gray-500 mt-0.5">Write intraday notes, mark each plan's outcome, add review notes</p>
            <p className="text-sm text-gray-400 mt-1">{tradingDay.symbol_name} · {formatDate(tradingDay.trade_date)}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Stat label="Plans" value={dayPlans.length} />
            <Stat label="Successful" value={successCount} color="emerald" />
            <Stat label="Failed" value={failedCount} color="red" />
            {c2cCount > 0 && <Stat label="C2C" value={c2cCount} color="amber" />}
            {unplannedCount > 0 && <Stat label="UnPlanned" value={unplannedCount} color="violet" />}
            {cancelledCount > 0 && <Stat label="Cancelled" value={cancelledCount} color="gray" />}
            {waitingCount > 0 && <Stat label="Waiting" value={waitingCount} color="gray" />}
          </div>
        </div>
      </div>

      {dayPlans.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-gray-500">No plans were created for this day.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setAllExpanded(v => !v)}
              className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              {allExpanded ? 'Shrink All' : 'Expand All'}
            </button>
          </div>
          <div className="space-y-3">
            {dayPlans.map(dp => (
              <PlanRow
                key={dp.id}
                dayPlan={dp}
                tradingDay={tradingDay}
                noteCount={noteCounts[dp.id] || 0}
                expandedOverride={allExpanded}
                onStatusChange={(s) => handleStatusChange(dp.id, s)}
                onNotesChange={(notes) => handleNotesChange(dp.id, notes)}
                onNotesBlur={() => handleNotesBlur(dp.id)}
                onOpenNotes={() => setOpenModal(dp)}
              />
            ))}
          </div>
        </>
      )}

      {openModal && (
        <IntradayNotesModal
          dayPlan={openModal}
          tradingDay={tradingDay}
          symbolName={selectedSymbol?.name}
          date={selectedDate}
          onClose={() => { setOpenModal(null); loadAll(); }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, color = 'gray' }) {
  const tones = {
    emerald: 'text-emerald-400',
    red:     'text-red-400',
    amber:   'text-amber-400',
    violet:  'text-violet-300',
    gray:    'text-gray-300',
  };
  return (
    <div className="text-center min-w-[60px]">
      <p className={`text-2xl font-bold ${tones[color]}`}>{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function PlanRow({ dayPlan, tradingDay, noteCount, expandedOverride, onStatusChange, onNotesChange, onNotesBlur, onOpenNotes }) {
  const biasColors = STOCK_PLAN_BIAS_COLORS[dayPlan.bias];
  const tag = deriveBehaviorTag(dayPlan.bias, dayPlan.behavior_tag);
  const tagColors = tag && tag !== dayPlan.bias ? BEHAVIOR_TAGS[tag] : null;
  const currentStatus = dayPlan.execution_status || 'Waiting';
  const statusColors = DAY_PLAN_STATUS_COLORS[currentStatus];

  const [expanded, setExpanded] = React.useState(false);
  const [outcomeShots, setOutcomeShots] = React.useState([]);

  React.useEffect(() => {
    if (expandedOverride !== undefined) setExpanded(expandedOverride);
  }, [expandedOverride]);

  const loadOutcomeShots = React.useCallback(async () => {
    const list = await window.api.dayPlanScreenshot.getByDayPlan(dayPlan.id, 'outcome');
    setOutcomeShots(list);
  }, [dayPlan.id]);
  React.useEffect(() => { loadOutcomeShots(); }, [loadOutcomeShots]);

  return (
    <div className="glass-card overflow-hidden">
      {/* Header — clickable to collapse/expand */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-700/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-200 truncate">{dayPlan.name}</p>
          {biasColors && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${biasColors.bg} ${biasColors.text} ${biasColors.border} border`}>
              {dayPlan.bias}
            </span>
          )}
          {tagColors && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${tagColors.bg} ${tagColors.text} ${tagColors.border} border`}>
              {tag}
            </span>
          )}
          {dayPlan.group_name && (
            <span className="text-[10px] text-gray-500 truncate">{dayPlan.group_name}</span>
          )}
          {statusColors && currentStatus !== 'Waiting' && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors.bg} ${statusColors.text} ${statusColors.border} border`}>
              {currentStatus}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
          {dayPlan.target != null && (
            <span className="text-[11px] text-gray-500">
              <span className="text-gray-600">T </span>
              <span className="text-emerald-400 font-medium">{dayPlan.target}</span>
            </span>
          )}
          {dayPlan.stop_out != null && (
            <span className="text-[11px] text-gray-500">
              <span className="text-gray-600">S </span>
              <span className="text-red-400 font-medium">{dayPlan.stop_out}</span>
            </span>
          )}
          <button
            onClick={onOpenNotes}
            className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
              noteCount > 0
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
                : 'bg-surface-700/60 border-surface-500/60 text-gray-400 hover:text-gray-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {noteCount > 0 ? `Notes (${noteCount})` : 'Notes'}
          </button>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 ml-3 transition-transform duration-200 shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-surface-600/30">
          {/* Execution status — editable chips */}
          <div className="pt-3">
            <label className="text-[10px] text-gray-500 uppercase mb-1.5 block">Execution Status</label>
            <div className="flex flex-wrap gap-1.5">
              {DAY_PLAN_STATUSES.map((s) => {
                const colors = DAY_PLAN_STATUS_COLORS[s];
                const active = currentStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${
                      active
                        ? `${colors.bg} ${colors.text} ${colors.border} font-medium`
                        : 'bg-surface-800 border-surface-600 text-gray-400 hover:border-surface-500'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Outcome notes — editable */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Outcome Notes</label>
            <textarea
              value={dayPlan.outcome_notes || ''}
              onChange={(e) => onNotesChange(e.target.value)}
              onBlur={onNotesBlur}
              rows={2}
              placeholder="What happened on this plan today?"
              className="input-field text-sm w-full resize-none"
            />
          </div>

          {/* Outcome screenshots */}
          <DayPlanScreenshotUploader
            dayPlanId={dayPlan.id}
            screenshots={outcomeShots}
            tradingDay={tradingDay}
            onRefresh={loadOutcomeShots}
            kind="outcome"
            label="Outcome Screenshot"
          />
        </div>
      )}
    </div>
  );
}
