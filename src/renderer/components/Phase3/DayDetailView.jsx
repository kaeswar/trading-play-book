import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../store/appStore';
import { useDayPlan } from '../../hooks/useDayPlan';
import {
  STOCK_PLAN_BIAS_COLORS, BEHAVIOR_TAGS, DAY_PLAN_STATUS_COLORS,
  formatDate, deriveBehaviorTag,
} from '../../../shared/constants';
import PlanFullViewModal from '../shared/PlanFullViewModal';
import DayIntradayNotesModal from '../shared/DayIntradayNotesModal';

export default function DayDetailView({ tradingDayId, dayIds = [], onBack, onNavigate }) {
  const { showNotification, selectedSymbol } = useApp();
  const { getByTradingDay, getScreenshots } = useDayPlan();
  const [tradingDay, setTradingDay]   = useState(null);
  const [dayPlans, setDayPlans]       = useState([]);
  const [noteCounts, setNoteCounts]   = useState({});
  const [loading, setLoading]         = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [openModal, setOpenModal]     = useState(null);   // dayPlan
  const [dayNotesOpen, setDayNotesOpen] = useState(false);
  const [dayNoteCount, setDayNoteCount] = useState(0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const td = await window.api.tradingDay.getById(tradingDayId);
      setTradingDay(td);
      const [plans, counts, dayCount] = await Promise.all([
        getByTradingDay(tradingDayId),
        window.api.intradayNote.countByTradingDay(tradingDayId),
        window.api.dayIntradayNote.count(tradingDayId),
      ]);
      setDayNoteCount(dayCount || 0);
      const plansWithShots = [];
      for (const p of plans) {
        const ss = await getScreenshots(p.id);
        plansWithShots.push({ ...p, screenshots: ss });
      }
      setDayPlans(plansWithShots);
      setNoteCounts(counts || {});
    } finally {
      setLoading(false);
    }
  }, [tradingDayId, getByTradingDay, getScreenshots]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await window.api.tradingDay.delete(tradingDayId);
      showNotification('Trading day deleted', 'success');
      onBack();
    } catch (err) {
      showNotification('Failed to delete', 'error');
      setDeleting(false);
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

  if (!tradingDay) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Day not found</p>
        <button onClick={onBack} className="btn-secondary mt-4">Go Back</button>
      </div>
    );
  }

  const currentIndex = dayIds.indexOf(tradingDayId);
  const prevId = currentIndex > 0 ? dayIds[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 && currentIndex < dayIds.length - 1 ? dayIds[currentIndex + 1] : null;

  const successCount   = dayPlans.filter(p => p.execution_status === 'Successful').length;
  const failedCount    = dayPlans.filter(p => p.execution_status === 'Failed').length;
  const c2cCount       = dayPlans.filter(p => p.execution_status === 'Cost-to-Cost').length;
  const unplannedCount = dayPlans.filter(p => p.execution_status === 'UnPlanned').length;
  const cancelledCount = dayPlans.filter(p => p.execution_status === 'Cancelled').length;
  const inactiveCount  = dayPlans.filter(p => p.execution_status === 'In-Active').length;
  const waitingCount   = dayPlans.filter(p => !p.execution_status || p.execution_status === 'Waiting').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => prevId && onNavigate(prevId)} disabled={!prevId} className="px-2 py-1 rounded-md bg-surface-700 hover:bg-surface-600 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => nextId && onNavigate(nextId)} disabled={!nextId} className="px-2 py-1 rounded-md bg-surface-700 hover:bg-surface-600 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* Scorecard */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gray-500 mb-1">{tradingDay.symbol_name}</p>
            <p className="text-lg font-semibold text-gray-200">{formatDate(tradingDay.trade_date)}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Stat label="Plans" value={dayPlans.length} />
            <Stat label="Successful" value={successCount} color="emerald" />
            <Stat label="Failed" value={failedCount} color="red" />
            {c2cCount > 0 && <Stat label="Cost-to-Cost" value={c2cCount} color="amber" />}
            {unplannedCount > 0 && <Stat label="UnPlanned" value={unplannedCount} color="violet" />}
            {cancelledCount > 0 && <Stat label="Cancelled" value={cancelledCount} color="gray" />}
            {inactiveCount > 0 && <Stat label="In-Active" value={inactiveCount} color="slate" />}
            {waitingCount > 0 && <Stat label="Waiting" value={waitingCount} color="gray" />}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDayNotesOpen(true)}
              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
                dayNoteCount > 0
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 hover:bg-sky-500/30'
                  : 'bg-surface-700/60 border-surface-500/60 text-gray-400 hover:text-gray-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {dayNoteCount > 0 ? `Day Notes (${dayNoteCount})` : 'Day Notes'}
            </button>
          </div>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-500/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Day
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-surface-700 border border-surface-500 rounded-lg px-2 py-1">
              <span className="text-[11px] text-gray-300">Delete day?</span>
              <button onClick={handleDelete} disabled={deleting} className="text-[11px] px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded transition-colors">
                {deleting ? '...' : 'Yes'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-[11px] px-2 py-0.5 bg-surface-600 hover:bg-surface-500 text-gray-300 rounded transition-colors">No</button>
            </div>
          )}
        </div>
        {tradingDay.notes && (
          <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-surface-600/40">{tradingDay.notes}</p>
        )}
      </div>

      {dayPlans.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-gray-500">No plans were created for this day.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dayPlans.map((dp) => (
            <DayPlanReadCard
              key={dp.id}
              dayPlan={dp}
              noteCount={noteCounts[dp.id] || 0}
              onClick={() => setOpenModal(dp)}
            />
          ))}
        </div>
      )}

      {openModal && (
        <PlanFullViewModal
          dayPlans={dayPlans}
          initialId={openModal.id}
          onClose={() => { setOpenModal(null); loadAll(); }}
        />
      )}

      {dayNotesOpen && tradingDay && (
        <DayIntradayNotesModal
          tradingDay={tradingDay}
          symbolName={tradingDay.symbol_name}
          date={tradingDay.trade_date}
          onClose={() => { setDayNotesOpen(false); loadAll(); }}
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
    slate:   'text-slate-400',
    gray:    'text-gray-300',
  };
  return (
    <div className="text-center min-w-[60px]">
      <p className={`text-2xl font-bold ${tones[color]}`}>{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function DayPlanReadCard({ dayPlan, noteCount, onClick }) {
  const biasColors = STOCK_PLAN_BIAS_COLORS[dayPlan.bias];
  const tag = deriveBehaviorTag(dayPlan.bias, dayPlan.behavior_tag);
  const tagColors = tag && tag !== dayPlan.bias ? BEHAVIOR_TAGS[tag] : null;
  const execColors = dayPlan.execution_status && dayPlan.execution_status !== 'Waiting'
    ? DAY_PLAN_STATUS_COLORS[dayPlan.execution_status]
    : null;
  const allShots = dayPlan.screenshots || [];
  const setupShots = allShots.filter(s => (s.kind || 'setup') === 'setup');
  const outcomeShots = allShots.filter(s => s.kind === 'outcome');

  const accentGradient = dayPlan.bias && dayPlan.bias.includes('Bullish')
    ? 'from-blue-500 to-cyan-500'
    : dayPlan.bias && dayPlan.bias.includes('Bearish')
      ? 'from-red-500 to-orange-500'
      : 'from-slate-500 to-slate-400';

  return (
    <div
      onClick={onClick}
      className="glass-card p-4 space-y-3 cursor-pointer hover:ring-1 hover:ring-primary-500/40 transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-1.5 h-7 rounded-full bg-gradient-to-b ${accentGradient} flex-shrink-0`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-200 truncate">{dayPlan.name}</p>
            {dayPlan.group_name && (
              <span className="text-[10px] text-gray-500 truncate">{dayPlan.group_name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
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
          {execColors && (
            <span className={`text-[10px] px-2 py-0.5 rounded ${execColors.bg} ${execColors.text} ${execColors.border} border`}>
              {dayPlan.execution_status}
            </span>
          )}
        </div>
      </div>

      {dayPlan.description && (
        <p className="text-xs text-gray-400 leading-relaxed">{dayPlan.description}</p>
      )}

      {/* Numbers */}
      {(dayPlan.target != null || dayPlan.stop_out != null) && (
        <div className="flex gap-4">
          {dayPlan.target != null && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500">Target</span>
              <span className="text-xs font-medium text-emerald-400">{dayPlan.target}</span>
            </div>
          )}
          {dayPlan.stop_out != null && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500">Stop</span>
              <span className="text-xs font-medium text-red-400">{dayPlan.stop_out}</span>
            </div>
          )}
        </div>
      )}

      {/* Setup Screenshots */}
      {setupShots.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase mb-1">Setup Screenshots</p>
          <div className="flex gap-1.5 flex-wrap">
            {setupShots.map(ss => (
              <ScreenshotChip key={ss.id} filePath={ss.file_path} />
            ))}
          </div>
        </div>
      )}

      {/* Outcome notes (from post-market) */}
      {dayPlan.outcome_notes && (
        <div className="pt-2 border-t border-surface-600/30">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Outcome Notes</p>
          <p className="text-xs text-gray-400 whitespace-pre-wrap">{dayPlan.outcome_notes}</p>
        </div>
      )}

      {/* Outcome Screenshots */}
      {outcomeShots.length > 0 && (
        <div className="pt-2 border-t border-surface-600/30">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Outcome Screenshots</p>
          <div className="flex gap-1.5 flex-wrap">
            {outcomeShots.map(ss => (
              <ScreenshotChip key={ss.id} filePath={ss.file_path} />
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-surface-600/30">
        {noteCount > 0 ? (
          <span className="text-[10px] text-amber-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {noteCount} intraday {noteCount === 1 ? 'note' : 'notes'}
          </span>
        ) : <span />}
        <span className="text-[10px] text-gray-600 group-hover:text-gray-400 flex items-center gap-1">
          Click to view full picture
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  );
}

function ScreenshotChip({ filePath }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    window.api.image.getFullPath(filePath).then(async (full) => {
      if (full) {
        const url = await window.api.image.toDataUrl(full);
        if (url) setSrc(url);
      }
    });
  }, [filePath]);
  return (
    <button
      onClick={() => window.api.image.openViewer(filePath)}
      className="w-12 h-12 rounded-md overflow-hidden border border-surface-500/60 hover:border-primary-400/60 transition-colors"
    >
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-surface-700" />
      )}
    </button>
  );
}
