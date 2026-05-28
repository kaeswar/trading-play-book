import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../store/appStore';
import { useTradingDay } from '../../hooks/useTradingDay';
import {
  getBehaviorTag, BEHAVIOR_TAGS, BEHAVIOR_TAG_ORDER,
  CUSTOM_VERDICT_COLORS,
  formatDate, formatPossibilityCode, BIAS_COLORS, OUTCOME_COLORS, getOutcomeColors,
} from '../../../shared/constants';
import IntradayNotesModal from '../shared/IntradayNotesModal';

export default function BehaviorView() {
  const { selectedSymbol, selectedDate, setSelectedDate } = useApp();
  const { createOrGetTradingDay, getTradingDayDetails } = useTradingDay();

  const [tradingDay, setTradingDay] = useState(null);
  const [customPlans, setCustomPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [allDates, setAllDates] = useState([]);
  const [primeFilter, setPrimeFilter] = useState('plan'); // plan | verdict
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [noteCounts, setNoteCounts] = useState({ outcomePlanCounts: {}, customPlanCounts: {} });

  // Load all available dates for this symbol
  useEffect(() => {
    const loadDates = async () => {
      if (!selectedSymbol) return;
      try {
        const filters = { symbolId: selectedSymbol.id };
        const days = await window.api.query.getFilteredDays(filters);
        const dates = days.map((d) => d.trade_date).sort().reverse();
        setAllDates(dates);
      } catch (err) {
        console.error('Failed to load dates:', err);
      }
    };
    loadDates();
  }, [selectedSymbol]);

  // Load behavior data for the selected date
  useEffect(() => {
    const load = async () => {
      if (!selectedSymbol || !selectedDate) return;
      setLoading(true);
      try {
        const day = await createOrGetTradingDay(selectedDate, selectedSymbol.id);
        if (day) {
          const details = await getTradingDayDetails(day.id);
          setTradingDay(details);
          // Load custom plans
          const plans = await window.api.customPlan.getByTradingDay(day.id);
          const plansWithScreenshots = [];
          for (const p of plans) {
            const screenshots = await window.api.customPlanScreenshot.getByCustomPlan(p.id);
            plansWithScreenshots.push({ ...p, screenshots });
          }
          setCustomPlans(plansWithScreenshots);
          // Load intraday note counts
          try {
            const counts = await window.api.intradayNote.countByTradingDay(day.id);
            setNoteCounts(counts);
          } catch (e) { /* ignore */ }
        }
      } catch (err) {
        console.error('Failed to load behavior data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedSymbol, selectedDate]);

  // Build behavior entries based on prime filter
  const allEntries = useMemo(() => {
    if (!tradingDay) return [];

    if (primeFilter === 'verdict') {
      // Verdict-based: single entry from the verdict
      const entries = [];
      const v = tradingDay.verdict;
      if (v) {
        const tag = getBehaviorTag(v.possibility_code, v.outcome);
        if (tag) {
          const p = tradingDay.possibilities?.find((pp) => pp.code === v.possibility_code);
          // Find the outcome plan ID for this verdict's possibility+outcome
          const outcomePlan = p?.outcomePlans?.find(op => op.outcome === v.outcome);
          const noteCount = outcomePlan?.id ? (noteCounts.outcomePlanCounts[outcomePlan.id] || 0) : 0;
          entries.push({
            possibilityCode: v.possibility_code,
            possibilityBias: v.bias,
            possibilityLabel: p?.label || '',
            outcome: v.outcome,
            target: null,
            stopOut: null,
            screenshots: [],
            hadPlan: v.had_plan,
            notes: v.notes,
            tag,
            outcomePlanId: outcomePlan?.id,
            tradingDayId: tradingDay.id,
            noteCount,
          });
        }
      }
      // Add custom plans with verdicts
      for (const cp of customPlans) {
        if (!cp.bias_tag || !cp.verdict_status) continue;
        const cpNoteCount = noteCounts.customPlanCounts[cp.id] || 0;
        entries.push({
          possibilityCode: cp.title || 'Custom Plan',
          possibilityBias: cp.bias_tag.includes('Bullish') ? 'Bullish' : 'Bearish',
          possibilityLabel: cp.trade_plan || '',
          outcome: cp.verdict_status,
          target: cp.target,
          stopOut: cp.stop_out,
          screenshots: cp.screenshots || [],
          notes: cp.verdict_notes,
          tag: cp.bias_tag,
          isCustom: true,
          customPlanId: cp.id,
          tradingDayId: tradingDay.id,
          noteCount: cpNoteCount,
        });
      }
      return entries;
    }

    // Plan-based: entries from planned possibilities
    const entries = [];
    if (tradingDay.possibilities) {
      for (const p of tradingDay.possibilities) {
        if (p.has_plan !== 1 || !p.outcomePlans) continue;
        for (const op of p.outcomePlans) {
          const hasData =
            op.target != null ||
            op.stop_out != null ||
            (op.description && op.description.trim()) ||
            (op.screenshots && op.screenshots.length > 0) ||
            (noteCounts.outcomePlanCounts[op.id] || 0) > 0;
          if (!hasData) continue;
          const tag = getBehaviorTag(p.code, op.outcome);
          if (!tag) continue;
          const noteCount = noteCounts.outcomePlanCounts[op.id] || 0;
          entries.push({
            possibilityCode: p.code,
            possibilityBias: p.bias,
            possibilityLabel: p.label || '',
            outcome: op.outcome,
            target: op.target,
            stopOut: op.stop_out,
            screenshots: op.screenshots || [],
            tag,
            outcomePlanId: op.id,
            tradingDayId: tradingDay.id,
            noteCount,
          });
        }
      }
    }

    // Add custom plans with bias tags
    for (const cp of customPlans) {
      if (!cp.bias_tag) continue;
      const cpNoteCount = noteCounts.customPlanCounts[cp.id] || 0;
      entries.push({
        possibilityCode: cp.title || 'Custom Plan',
        possibilityBias: cp.bias_tag.includes('Bullish') ? 'Bullish' : 'Bearish',
        possibilityLabel: cp.trade_plan || '',
        outcome: cp.verdict_status || 'Waiting',
        target: cp.target,
        stopOut: cp.stop_out,
        screenshots: cp.screenshots || [],
        tag: cp.bias_tag,
        isCustom: true,
        customPlanId: cp.id,
        tradingDayId: tradingDay.id,
        noteCount: cpNoteCount,
      });
    }

    return entries;
  }, [tradingDay, primeFilter, customPlans, noteCounts]);

  // Count per tag
  const tagCounts = useMemo(() => {
    const counts = {};
    for (const e of allEntries) {
      counts[e.tag] = (counts[e.tag] || 0) + 1;
    }
    return counts;
  }, [allEntries]);

  // Filter by selected tags
  const filteredEntries = useMemo(() => {
    if (selectedTags.size === 0) return allEntries;
    return allEntries.filter((e) => selectedTags.has(e.tag));
  }, [allEntries, selectedTags]);

  // Compute which possibility codes have at least one outcome with notes
  const activePossibilities = useMemo(() => {
    const active = new Set();
    for (const e of allEntries) {
      if (e.noteCount > 0) active.add(e.possibilityCode);
    }
    return active;
  }, [allEntries]);

  const toggleTag = (tag) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const clearFilters = () => setSelectedTags(new Set());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (allDates.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-gray-500">No plans found for {selectedSymbol?.name}</p>
        <p className="text-xs text-gray-600 mt-1">Create plans in the Planning view first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date selector + Prime Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{selectedSymbol?.name}</span>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field text-sm py-1 px-2 w-auto"
          >
            {allDates.map((d) => (
              <option key={d} value={d}>{formatDate(d)}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 uppercase">Prime Filter</span>
          <div className="flex gap-1 p-0.5 bg-surface-800 rounded-lg">
            <button
              onClick={() => { setPrimeFilter('plan'); setSelectedTags(new Set()); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                primeFilter === 'plan'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Plan Based
            </button>
            <button
              onClick={() => { setPrimeFilter('verdict'); setSelectedTags(new Set()); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                primeFilter === 'verdict'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Verdict Based
            </button>
          </div>
        </div>
        {selectedTags.size > 0 && (
          <button onClick={clearFilters} className="text-xs text-primary-400 hover:text-primary-300">
            Clear filters
          </button>
        )}
      </div>

      {/* Behavior Tag Filters — multi-select */}
      <div className="flex flex-wrap gap-2">
        {BEHAVIOR_TAG_ORDER.map((tag) => {
          const colors = BEHAVIOR_TAGS[tag];
          const isSelected = selectedTags.has(tag);
          const count = tagCounts[tag] || 0;
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? `${colors.bg} ${colors.text} border ${colors.border}`
                  : count === 0
                    ? 'bg-surface-800 text-gray-600 border border-surface-700 cursor-default'
                    : 'bg-surface-700 text-gray-400 hover:bg-surface-600 border border-surface-500'
              }`}
              disabled={count === 0}
            >
              {tag}
              {count > 0 && <span className="ml-1.5 opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Outcome Plan Cards */}
      {allEntries.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500">
            {primeFilter === 'verdict'
              ? 'No verdict recorded for this date'
              : 'No planned outcomes for this date'}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {primeFilter === 'verdict'
              ? 'Record a verdict in the Verdict view first'
              : 'Create plans in the Planning view first'}
          </p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-gray-500">No outcomes match the selected filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredEntries.map((entry, idx) => {
            const today = new Date().toISOString().split('T')[0];
            const isLiveDay = selectedDate === today && !tradingDay?.verdict;
            return (
              <BehaviorEntryCard
                key={idx}
                entry={entry}
                isDimmed={!isLiveDay && entry.noteCount === 0}
                onClick={() => setSelectedEntry(entry)}
              />
            );
          })}
        </div>
      )}

      {selectedEntry && (
        <IntradayNotesModal
          entry={selectedEntry}
          tradingDay={tradingDay}
          customPlans={customPlans}
          symbolName={selectedSymbol?.name}
          date={selectedDate}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}

function BehaviorEntryCard({ entry, isDimmed, onClick }) {
  const tagColors = BEHAVIOR_TAGS[entry.tag];
  const biasColors = BIAS_COLORS[entry.possibilityBias];
  const outcomeColors = entry.isCustom
    ? (CUSTOM_VERDICT_COLORS[entry.outcome] || { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' })
    : getOutcomeColors(entry.outcome, entry.possibilityBias);
  const hasNotes = entry.noteCount > 0;

  const cardClasses = hasNotes
    ? 'glass-card p-4 space-y-3 cursor-pointer ring-2 ring-amber-500/50 hover:ring-amber-400/70 transition-all'
    : isDimmed
      ? 'glass-card p-4 space-y-3 cursor-pointer hover:ring-1 hover:ring-primary-500/40 transition-all opacity-40 hover:opacity-70'
      : 'glass-card p-4 space-y-3 cursor-pointer hover:ring-1 hover:ring-primary-500/40 transition-all';

  return (
    <div className={cardClasses} onClick={onClick}>
      {/* Header: behavior tag + outcome + Notes Taken */}
      <div className="flex items-center justify-between">
        <span className={`badge text-[10px] ${tagColors.bg} ${tagColors.text} border ${tagColors.border}`}>
          {entry.tag}
        </span>
        <div className="flex items-center gap-1.5">
          {hasNotes && (
            <span className="badge text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Notes Taken
            </span>
          )}
          <span className={`badge text-[10px] ${outcomeColors.bg} ${outcomeColors.text} border ${outcomeColors.border}`}>
            {entry.outcome}
          </span>
        </div>
      </div>

      {/* Possibility info */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`w-1.5 h-1.5 rounded-full ${entry.possibilityBias === 'Bullish' ? 'bg-blue-400' : 'bg-red-400'}`} />
          <span className={`text-[10px] font-medium ${biasColors.text}`}>{entry.possibilityBias}</span>
        </div>
        <p className="text-sm font-medium text-gray-200">
          {formatPossibilityCode(entry.possibilityCode)}
        </p>
      </div>

      {/* Target / Stop */}
      {(entry.target || entry.stopOut) && (
        <div className="flex gap-3">
          {entry.target && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500">Target</span>
              <span className="text-xs font-medium text-emerald-400">{entry.target}</span>
            </div>
          )}
          {entry.stopOut && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500">Stop</span>
              <span className="text-xs font-medium text-red-400">{entry.stopOut}</span>
            </div>
          )}
        </div>
      )}

      {/* Verdict-specific info */}
      {entry.hadPlan !== undefined && (
        <div className="flex items-center gap-2">
          <span className={`badge text-[10px] ${entry.hadPlan ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-500'}`}>
            {entry.hadPlan ? 'Had Plan' : 'No Plan'}
          </span>
        </div>
      )}
      {entry.notes && (
        <p className="text-xs text-gray-400 line-clamp-2">{entry.notes}</p>
      )}

      {/* Screenshots */}
      {entry.screenshots.length > 0 && (
        <div className="flex gap-1.5">
          {entry.screenshots.slice(0, 4).map((ss) => (
            <BehaviorScreenshotThumb key={ss.id} filePath={ss.file_path} />
          ))}
          {entry.screenshots.length > 4 && (
            <span className="text-[10px] text-gray-500 self-center">+{entry.screenshots.length - 4}</span>
          )}
        </div>
      )}
    </div>
  );
}

function BehaviorScreenshotThumb({ filePath }) {
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

  const handleClick = (e) => {
    e.stopPropagation();
    window.api.image.openViewer(filePath);
  };

  return (
    <div
      onClick={handleClick}
      className="relative group w-10 h-10 rounded-lg overflow-hidden border border-surface-500/60 hover:border-primary-400/60 transition-all duration-200 hover:scale-105 flex-shrink-0 cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(e); }}
    >
      {src ? (
        <>
          <img
            src={src}
            alt=""
            className={`w-full h-full object-cover transition-all duration-200 group-hover:brightness-75 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setSrc(null)}
          />
          {!loaded && (
            <div className="absolute inset-0 bg-surface-700 animate-pulse" />
          )}
        </>
      ) : (
        <div className="w-full h-full bg-surface-700 flex items-center justify-center">
          <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
      )}
    </div>
  );
}
