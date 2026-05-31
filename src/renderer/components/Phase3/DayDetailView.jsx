import React, { useState, useEffect } from 'react';
import { useTradingDay } from '../../hooks/useTradingDay';
import { useApp } from '../../store/appStore';
import { POSSIBILITIES, OUTCOME_COLORS, BIAS_COLORS, CUSTOM_VERDICT_COLORS, BEHAVIOR_TAGS, getBehaviorTag, getOutcomeColors, formatPossibilityCode, formatDate } from '../../../shared/constants';
import PlanDetailModal from '../shared/PlanDetailModal';
import IntradayNotesModal from '../shared/IntradayNotesModal';

export default function DayDetailView({ tradingDayId, dayIds = [], onBack, onNavigate }) {
  const { getTradingDayDetails } = useTradingDay();
  const { showNotification } = useApp();
  const [day, setDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPlannedOnly, setShowPlannedOnly] = useState(true);
  const [verdictScreenshots, setVerdictScreenshots] = useState([]);
  const [customPlans, setCustomPlans] = useState([]);
  const [modalPlan, setModalPlan] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [noteCounts, setNoteCounts] = useState({ outcomePlanCounts: {}, customPlanCounts: {} });
  const [activeTab, setActiveTab] = useState('plans');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const details = await getTradingDayDetails(tradingDayId);
      setDay(details);
      if (details?.verdict) {
        const screenshots = await window.api.verdictScreenshot.getByVerdict(details.verdict.id);
        setVerdictScreenshots(screenshots);
      } else {
        setVerdictScreenshots([]);
      }
      const plans = await window.api.customPlan.getByTradingDay(tradingDayId);
      const plansWithScreenshots = [];
      for (const plan of plans) {
        const screenshots = await window.api.customPlanScreenshot.getByCustomPlan(plan.id);
        plansWithScreenshots.push({ ...plan, screenshots });
      }
      setCustomPlans(plansWithScreenshots);
      try {
        const counts = await window.api.intradayNote.countByTradingDay(tradingDayId);
        setNoteCounts(counts);
      } catch (e) { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [tradingDayId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await window.api.tradingDay.delete(tradingDayId);
      showNotification('Trading day deleted', 'success');
      onBack();
    } catch (err) {
      showNotification('Failed to delete trading day', 'error');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!day) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Day not found</p>
        <button onClick={onBack} className="btn-secondary mt-4">Go Back</button>
      </div>
    );
  }

  const currentIndex = dayIds.indexOf(tradingDayId);
  const prevId = currentIndex > 0 ? dayIds[currentIndex - 1] : null;
  const nextId = currentIndex < dayIds.length - 1 ? dayIds[currentIndex + 1] : null;

  const preparedOutcomes = day.possibilities.reduce((sum, p) => {
    const filled = (p.outcomePlans || []).filter(op =>
      op.target != null ||
      op.stop_out != null ||
      (op.description && op.description.trim()) ||
      (op.screenshots && op.screenshots.length > 0) ||
      (noteCounts.outcomePlanCounts[op.id] || 0) > 0
    ).length;
    return sum + filled;
  }, 0);
  const preparedCount = day.possibilities.filter(p => p.has_plan === 1).length;
  const dayOfWeek = new Date(day.trade_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' });
  const v = day.verdict;

  const tabs = [
    { id: 'plans',   label: 'Plans',   badge: preparedCount > 0 ? String(preparedCount) : null, badgeStyle: 'primary' },
    { id: 'verdict', label: 'Verdict', badge: !v ? 'Pending' : null,                      badgeStyle: 'amber' },
    { id: 'notes',   label: 'Notes',   badge: null,                                        badgeStyle: null },
  ];

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="btn-ghost flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-lg font-bold text-gray-100">{day.symbol_name}</span>
            <span className="text-gray-600">·</span>
            <span className="text-base text-gray-300">{formatDate(day.trade_date)}</span>
            <span className="text-gray-600">·</span>
            <span className="text-sm text-gray-500">{dayOfWeek}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Prev / Next navigation */}
          {dayIds.length > 1 && (
            <div className="flex items-center gap-1 bg-surface-800 border border-surface-600/50 rounded-lg px-1 py-1">
              <button
                onClick={() => prevId && onNavigate?.(prevId)}
                disabled={!prevId}
                title="Newer day"
                className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-100 hover:bg-surface-700 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-[11px] text-gray-500 px-1 tabular-nums">
                {currentIndex + 1} / {dayIds.length}
              </span>
              <button
                onClick={() => nextId && onNavigate?.(nextId)}
                disabled={!nextId}
                title="Older day"
                className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-100 hover:bg-surface-700 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2"
            title="Delete Day"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Scorecard ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ScoreTile
          label="Bias"
          value={v?.bias || '—'}
          valueClass={v?.bias ? BIAS_COLORS[v.bias]?.text : 'text-gray-600'}
          accent={v?.bias ? BIAS_COLORS[v.bias]?.bg : ''}
        />
        <ScoreTile
          label="Outcome"
          value={v?.outcome || '—'}
          valueClass={v?.outcome ? getOutcomeColors(v.outcome, v.bias)?.text : 'text-gray-600'}
          accent={v?.outcome ? getOutcomeColors(v.outcome, v.bias)?.bg : ''}
        />
        <ScoreTile
          label="Prepared"
          value={!v ? 'Pending' : v.had_plan ? 'Yes' : 'No'}
          valueClass={!v ? 'text-gray-500' : v.had_plan ? 'text-emerald-400' : 'text-amber-400'}
          accent={!v ? '' : v.had_plan ? 'bg-emerald-500/10' : 'bg-amber-500/10'}
        />
        <ScoreTile
          label="Prepared for"
          value={`${preparedOutcomes} Outcomes`}
          valueClass="text-primary-400"
          accent="bg-primary-500/10"
        />
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex border-b border-surface-600/50 -mb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-surface-500'
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                tab.badgeStyle === 'primary'
                  ? activeTab === tab.id ? 'bg-primary-500/20 text-primary-400' : 'bg-surface-600 text-gray-500'
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="pt-1">
        {activeTab === 'plans' && (
          <PlansTab
            day={day}
            customPlans={customPlans}
            noteCounts={noteCounts}
            showPlannedOnly={showPlannedOnly}
            setShowPlannedOnly={setShowPlannedOnly}
            onSelectPlan={(plan, type, outcomePlanId) => {
              if (type === 'default') {
                const op = plan.outcomePlans?.find(o => o.id === outcomePlanId);
                if (!op) return;
                const spec = POSSIBILITIES.find(sp => sp.code === plan.code);
                setSelectedEntry({
                  possibilityCode: plan.code,
                  possibilityLabel: spec?.label || '',
                  outcome: op.outcome,
                  target: op.target,
                  stopOut: op.stop_out,
                  screenshots: op.screenshots || [],
                  tag: getBehaviorTag(plan.code, op.outcome),
                  noteCount: noteCounts.outcomePlanCounts[op.id] || 0,
                  isCustom: false,
                  tradingDayId: day.id,
                  outcomePlanId: op.id,
                  possibilityBias: plan.bias,
                  description: op.description || null,
                });
              } else {
                setModalPlan({ plan, type, outcomePlanId });
              }
            }}
          />
        )}
        {activeTab === 'verdict' && (
          <VerdictTab verdict={v} screenshots={verdictScreenshots} />
        )}
        {activeTab === 'notes' && (
          <NotesTab notes={day.notes} />
        )}
      </div>

      {/* ── Delete Confirmation ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">Delete Trading Day</h3>
                <p className="text-sm text-gray-400">{formatDate(day.trade_date)} — {day.symbol_name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-6">
              This will permanently delete all data for this day including the verdict, all plans, and all screenshots. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting} className="btn-secondary">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Intraday Notes Modal (default outcome click, view-only) ── */}
      {selectedEntry && (
        <IntradayNotesModal
          entry={selectedEntry}
          tradingDay={day}
          customPlans={customPlans}
          onClose={() => setSelectedEntry(null)}
          viewOnly
        />
      )}

      {/* ── Plan Detail Modal (custom plan click) ── */}
      {modalPlan && (
        <PlanDetailModal
          plan={modalPlan.plan}
          type={modalPlan.type}
          verdict={day?.verdict}
          outcomePlanId={modalPlan.outcomePlanId}
          symbolName={day.symbol_name}
          tradeDate={day.trade_date}
          onClose={() => setModalPlan(null)}
        />
      )}
    </div>
  );
}

/* ─── Score Tile ─── */
function ScoreTile({ label, value, valueClass, accent }) {
  return (
    <div className={`rounded-xl border border-surface-600/40 p-4 flex flex-col gap-1 ${accent || 'bg-surface-800/60'}`}>
      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">{label}</span>
      <span className={`text-base font-bold truncate ${valueClass}`}>{value}</span>
    </div>
  );
}

/* ─── Plans Tab ─── */
function PlansTab({ day, customPlans, noteCounts, showPlannedOnly, setShowPlannedOnly, onSelectPlan }) {
  const bullish = day.possibilities.filter(p => p.bias === 'Bullish').filter(p => !showPlannedOnly || p.has_plan === 1);
  const bearish = day.possibilities.filter(p => p.bias === 'Bearish').filter(p => !showPlannedOnly || p.has_plan === 1);
  const hasDefaults = bullish.length > 0 || bearish.length > 0;
  const hasCustom = customPlans.length > 0;

  if (!hasDefaults && !hasCustom) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">No plans recorded for this day.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Default Plans */}
      {hasDefaults && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-primary-500 to-blue-400"></div>
              <h3 className="section-title">Default Plans</h3>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs text-gray-500">Planned only</span>
              <input
                type="checkbox"
                checked={showPlannedOnly}
                onChange={e => setShowPlannedOnly(e.target.checked)}
                className="w-4 h-4 rounded border-surface-500 text-primary-500 focus:ring-primary-500/30 bg-surface-700"
              />
            </label>
          </div>

          {bullish.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${BIAS_COLORS.Bullish.accent}`}></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Bullish Openings</span>
              </div>
              {bullish.map(p => (
                <PossibilityOutcomeGroup
                  key={p.id}
                  possibility={p}
                  verdict={day.verdict}
                  noteCounts={noteCounts.outcomePlanCounts}
                  onSelectOutcome={op => onSelectPlan(p, 'default', op.id)}
                />
              ))}
            </div>
          )}

          {bearish.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${BIAS_COLORS.Bearish.accent}`}></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Bearish Openings</span>
              </div>
              {bearish.map(p => (
                <PossibilityOutcomeGroup
                  key={p.id}
                  possibility={p}
                  verdict={day.verdict}
                  noteCounts={noteCounts.outcomePlanCounts}
                  onSelectOutcome={op => onSelectPlan(p, 'default', op.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Custom Plans */}
      {hasCustom && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500"></div>
            <h3 className="section-title text-purple-400">Custom Plans</h3>
            <span className="text-[10px] text-gray-500">({customPlans.length})</span>
          </div>

          {customPlans.some(cp => cp.bias_tag?.includes('Bullish')) && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${BIAS_COLORS.Bullish.accent}`}></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Bullish</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {customPlans.filter(cp => cp.bias_tag?.includes('Bullish')).map(plan => (
                  <CustomPlanCard
                    key={plan.id}
                    plan={plan}
                    noteCount={noteCounts.customPlanCounts[plan.id] || 0}
                    onClick={() => onSelectPlan(plan, 'custom')}
                  />
                ))}
              </div>
            </div>
          )}

          {customPlans.some(cp => cp.bias_tag?.includes('Bearish')) && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${BIAS_COLORS.Bearish.accent}`}></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Bearish</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {customPlans.filter(cp => cp.bias_tag?.includes('Bearish')).map(plan => (
                  <CustomPlanCard
                    key={plan.id}
                    plan={plan}
                    noteCount={noteCounts.customPlanCounts[plan.id] || 0}
                    onClick={() => onSelectPlan(plan, 'custom')}
                  />
                ))}
              </div>
            </div>
          )}

          {customPlans.some(cp => !cp.bias_tag) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {customPlans.filter(cp => !cp.bias_tag).map(plan => (
                <CustomPlanCard
                  key={plan.id}
                  plan={plan}
                  noteCount={noteCounts.customPlanCounts[plan.id] || 0}
                  onClick={() => onSelectPlan(plan, 'custom')}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ─── Verdict Tab ─── */
function VerdictTab({ verdict, screenshots }) {
  if (!verdict) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-gray-400 font-medium">No Verdict Recorded</p>
          <p className="text-sm text-gray-600 mt-1">Record the day's outcome in the Verdict phase.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5">
      <VerdictSummary verdict={verdict} screenshots={screenshots} />
    </div>
  );
}

/* ─── Notes Tab ─── */
function NotesTab({ notes }) {
  if (!notes) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-surface-700/60 flex items-center justify-center">
          <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </div>
        <p className="text-gray-500">No day notes recorded.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-start gap-3">
        <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{notes}</p>
      </div>
    </div>
  );
}

/* ─── Possibility Outcome Group ─── */
function PossibilityOutcomeGroup({ possibility, verdict, noteCounts, onSelectOutcome }) {
  const spec = POSSIBILITIES.find(sp => sp.code === possibility.code);
  const biasColor = BIAS_COLORS[possibility.bias];
  const isVerdict = verdict?.possibility_code === possibility.code;
  const hasPlan = possibility.has_plan === 1;

  if (!hasPlan || !possibility.outcomePlans || possibility.outcomePlans.length === 0) {
    return (
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className={`badge text-[10px] ${biasColor.bg} ${biasColor.text} border ${biasColor.border}`}>{possibility.bias}</span>
          <span className="text-sm font-medium text-gray-500">{formatPossibilityCode(possibility.code)}</span>
          <span className="badge text-[10px] bg-gray-500/20 text-gray-500">No Plan</span>
          {isVerdict && <span className="badge text-[10px] bg-primary-500/20 text-primary-400 border border-primary-500/30">Verdict</span>}
        </div>
        {spec && <p className="text-xs text-gray-600 mb-3 ml-1">{spec.label}</p>}
      </div>
    );
  }

  const plannedOutcomes = (possibility.outcomePlans || []).filter(op =>
    op.target != null ||
    op.stop_out != null ||
    (op.description && op.description.trim()) ||
    (op.screenshots && op.screenshots.length > 0) ||
    (noteCounts[op.id] || 0) > 0
  );

  if (plannedOutcomes.length === 0) return null;

  const hasAnyNotes = plannedOutcomes.some(op => (noteCounts[op.id] || 0) > 0);

  return (
    <div className={`mb-4 ${verdict && !isVerdict && !hasAnyNotes ? 'opacity-40 hover:opacity-70 transition-opacity' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`badge text-[10px] ${biasColor.bg} ${biasColor.text} border ${biasColor.border}`}>{possibility.bias}</span>
        <span className="text-sm font-medium text-gray-300">{formatPossibilityCode(possibility.code)}</span>
        {isVerdict && <span className="badge text-[10px] bg-primary-500/20 text-primary-400 border border-primary-500/30">Verdict</span>}
      </div>
      {spec && <p className="text-xs text-gray-500 mb-3 ml-1">{spec.label}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 ml-3">
        {plannedOutcomes.map(op => {
          const oc = getOutcomeColors(op.outcome, possibility.bias);
          const noteCount = noteCounts[op.id] || 0;
          const isVerdictOutcome = isVerdict && verdict?.outcome === op.outcome;
          const totalScreenshots = op.screenshots?.length || 0;
          const behaviorTag = getBehaviorTag(possibility.code, op.outcome);
          const behaviorColors = behaviorTag ? BEHAVIOR_TAGS[behaviorTag] : null;

          return (
            <div
              key={op.id}
              className={`glass-card p-4 space-y-3 cursor-pointer hover:ring-1 hover:ring-primary-500/40 transition-all ${
                isVerdictOutcome ? 'ring-2 ring-primary-500/50' : (verdict && !noteCount) ? 'opacity-40 hover:opacity-70' : ''
              }`}
              onClick={() => onSelectOutcome(op)}
            >
              {/* Header: behavior tag left, outcome + notes + verdict right */}
              <div className="flex items-center justify-between">
                <span className={`badge text-[10px] ${behaviorColors ? `${behaviorColors.bg} ${behaviorColors.text} border ${behaviorColors.border}` : `${oc.bg} ${oc.text} border ${oc.border}`}`}>
                  {behaviorTag || op.outcome}
                </span>
                <div className="flex items-center gap-1.5">
                  {noteCount > 0 && (
                    <span className="badge text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Notes
                    </span>
                  )}
                  <span className={`badge text-[10px] ${oc.bg} ${oc.text} border ${oc.border}`}>{op.outcome}</span>
                  {isVerdictOutcome && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>

              {/* Target / Stop inline */}
              {(op.target != null || op.stop_out != null) && (
                <div className="flex gap-3">
                  {op.target != null && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-500">Target</span>
                      <span className="text-xs font-medium text-emerald-400">{op.target}</span>
                    </div>
                  )}
                  {op.stop_out != null && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-500">Stop</span>
                      <span className="text-xs font-medium text-red-400">{op.stop_out}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {op.description && op.description.trim() && (
                <p className="text-xs text-gray-400 leading-relaxed">{op.description}</p>
              )}

              {/* Screenshot thumbnails */}
              {totalScreenshots > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {op.screenshots.slice(0, 4).map((ss) => (
                    <OutcomeScreenshotThumb key={ss.id} filePath={ss.file_path} />
                  ))}
                  {totalScreenshots > 4 && (
                    <span className="text-[10px] text-gray-500 self-center">+{totalScreenshots - 4}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OutcomeScreenshotThumb({ filePath }) {
  const [src, setSrc] = React.useState(null);
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    window.api.image.getFullPath(filePath).then(async (fullPath) => {
      if (fullPath) {
        const dataUrl = await window.api.image.toDataUrl(fullPath);
        if (dataUrl) setSrc(dataUrl);
      }
    });
  }, [filePath]);
  return (
    <div className="w-12 h-12 rounded-lg overflow-hidden border border-surface-500/60 flex-shrink-0">
      {src ? (
        <img
          src={src}
          alt=""
          className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setSrc(null)}
        />
      ) : (
        <div className="w-full h-full bg-surface-700 animate-pulse" />
      )}
    </div>
  );
}

/* ─── Verdict Summary ─── */
function VerdictSummary({ verdict, screenshots = [] }) {
  const spec = POSSIBILITIES.find(p => p.code === verdict.possibility_code);
  const biasColor = BIAS_COLORS[verdict.bias];
  const outcomeColor = getOutcomeColors(verdict.outcome, verdict.bias);

  return (
    <div className="flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${verdict.had_plan ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
        {verdict.had_plan ? (
          <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`badge text-xs ${biasColor.bg} ${biasColor.text} border ${biasColor.border}`}>{verdict.bias}</span>
          <span className={`badge text-xs ${outcomeColor.bg} ${outcomeColor.text} border ${outcomeColor.border}`}>{verdict.outcome}</span>
        </div>
        <p className="text-base font-semibold text-gray-100">{formatPossibilityCode(verdict.possibility_code)}</p>
        {spec && <p className="text-sm text-gray-400 mt-0.5">{spec.label}</p>}
        <div className="mt-2">
          {verdict.had_plan ? (
            <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">Plan existed</span>
          ) : (
            <span className="badge bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs">No plan — Unprepared</span>
          )}
        </div>
        {verdict.notes && <p className="text-sm text-gray-400 mt-3 leading-relaxed">{verdict.notes}</p>}
        {screenshots.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {screenshots.map(ss => <ScreenshotMini key={ss.id} filePath={ss.file_path} />)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Screenshot Mini ─── */
function ScreenshotMini({ filePath }) {
  const [src, setSrc] = React.useState(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
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
      className="relative group w-12 h-12 rounded-lg overflow-hidden border border-surface-500/60 hover:border-primary-400/60 transition-all duration-200 hover:shadow-md hover:shadow-primary-500/10 hover:scale-105"
      title="Click to zoom"
    >
      {src ? (
        <>
          <img src={src} alt="" className={`w-full h-full object-cover transition-all duration-200 group-hover:brightness-75 ${loaded ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setLoaded(true)} onError={() => setSrc(null)} />
          {!loaded && <div className="absolute inset-0 bg-surface-700 animate-pulse" />}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <svg className="w-5 h-5 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
          </div>
        </>
      ) : (
        <div className="w-full h-full bg-surface-700 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
        </div>
      )}
    </button>
  );
}

/* ─── Custom Plan Card ─── */
function CustomPlanCard({ plan, noteCount, onClick }) {
  const verdictColors = plan.verdict_status ? CUSTOM_VERDICT_COLORS[plan.verdict_status] : null;
  const isPassed = plan.verdict_status === 'Pass';

  return (
    <div
      className={`glass-card p-4 cursor-pointer hover:bg-surface-700/40 transition-all hover:ring-1 hover:ring-primary-500/30 ${
        plan.verdict_status && !isPassed ? 'opacity-40 hover:opacity-70' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-purple-500 to-fuchsia-500 flex-shrink-0"></div>
        <p className="text-sm text-gray-200 flex-1 min-w-0 truncate">{plan.title || 'Untitled Plan'}</p>
        {isPassed && (
          <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
        {noteCount > 0 && (
          <span className="badge text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 flex-shrink-0">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Notes
          </span>
        )}
        {plan.bias_tag && (() => {
          const tagColors = BEHAVIOR_TAGS[plan.bias_tag];
          return tagColors ? (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${tagColors.bg} ${tagColors.text} ${tagColors.border} border flex-shrink-0`}>{plan.bias_tag}</span>
          ) : null;
        })()}
        {verdictColors && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${verdictColors.bg} ${verdictColors.text} ${verdictColors.border} border flex-shrink-0`}>{plan.verdict_status}</span>
        )}
      </div>
      <div className="flex gap-4">
        {plan.target != null && <span className="text-xs text-emerald-400">Target: {plan.target}</span>}
        {plan.stop_out != null && <span className="text-xs text-red-400">Stop Out: {plan.stop_out}</span>}
      </div>
      {plan.screenshots && plan.screenshots.length > 0 && (
        <p className="text-[10px] text-gray-500 mt-1">{plan.screenshots.length} screenshot{plan.screenshots.length > 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
