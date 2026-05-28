import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../store/appStore';
import { useTradingDay } from '../../hooks/useTradingDay';
import { POSSIBILITIES, BIAS_COLORS, formatDate } from '../../../shared/constants';
import PossibilityCard from './PossibilityCard';
import CustomPlansSection from './CustomPlansSection';
import BehaviorView from '../Phase3/BehaviorView';

export default function PlanningView() {
  const { selectedSymbol, selectedDate, showNotification, setSaveDayPlanFn, setSavingDayPlan, refreshDatesFn, showNoPlan, setShowNoPlan } = useApp();
  const { createOrGetTradingDay, getTradingDayDetails, updateNotes } = useTradingDay();

  const [tradingDay, setTradingDay] = useState(null);
  const [notes, setNotes] = useState('');
  const [dayLoading, setDayLoading] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  const [dayExists, setDayExists] = useState(null); // null = checking, true/false = result
  const possibilityRefs = useRef({});
  const customPlansRef = useRef(null);
  const [subView, setSubView] = useState('plan'); // plan | analysis

  const loadDay = useCallback(async (showLoading = false) => {
    if (!selectedSymbol || !selectedDate) return;
    if (showLoading) setDayLoading(true);
    try {
      const existing = await window.api.tradingDay.getByDateAndSymbol(selectedDate, selectedSymbol.id);
      if (existing) {
        setDayExists(true);
        const details = await getTradingDayDetails(existing.id);
        setTradingDay(details);
        setNotes(details?.notes || '');
      } else {
        setDayExists(false);
      }
    } catch (err) {
      console.error('Failed to load day:', err);
    } finally {
      if (showLoading) setDayLoading(false);
    }
  }, [selectedSymbol, selectedDate]);

  // Check if day exists when date/symbol changes
  useEffect(() => {
    loadDay(true);
  }, [selectedSymbol, selectedDate]);

  const handleCreateDay = async () => {
    setDayLoading(true);
    try {
      const day = await createOrGetTradingDay(selectedDate, selectedSymbol.id);
      if (day) {
        const details = await getTradingDayDetails(day.id);
        setTradingDay(details);
        setNotes(details?.notes || '');
        setDayExists(true);
        // Refresh available dates in the header date picker
        if (refreshDatesFn) refreshDatesFn();
      }
    } catch (err) {
      console.error('Failed to create day:', err);
      showNotification('Failed to create day plan', 'error');
    } finally {
      setDayLoading(false);
    }
  };

  // Register save function with the app context so header button can call it
  const handleSaveDayPlan = useCallback(async () => {
    setSavingDayPlan(true);
    try {
      if (tradingDay) {
        await updateNotes(tradingDay.id, notes);
      }

      const refs = Object.values(possibilityRefs.current);
      for (const ref of refs) {
        if (ref?.saveAll) await ref.saveAll();
      }

      // Save custom plans
      if (customPlansRef.current?.saveAll) {
        await customPlansRef.current.saveAll();
      }

      showNotification('Entire day plan saved successfully', 'success');
      loadDay();
    } catch (err) {
      showNotification('Failed to save day plan', 'error');
    } finally {
      setSavingDayPlan(false);
    }
  }, [tradingDay, notes, possibilityRefs]);

  useEffect(() => {
    if (subView === 'plan') {
      setSaveDayPlanFn(() => handleSaveDayPlan);
    } else {
      setSaveDayPlanFn(null);
    }
    return () => setSaveDayPlanFn(null);
  }, [handleSaveDayPlan, subView]);

  const handleRefresh = useCallback(() => {
    loadDay(false);
  }, [loadDay]);

  if (!selectedSymbol) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Select a symbol to begin planning</p>
      </div>
    );
  }

  if (dayLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Show create day prompt if no day exists for this date
  if (dayExists === false) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-surface-700 flex items-center justify-center">
          <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-gray-300 font-medium">No Trading Plan for {formatDate(selectedDate)}</p>
          <p className="text-sm text-gray-500 mt-1">Would you like to create a new day plan?</p>
        </div>
        <button onClick={handleCreateDay} className="btn-primary text-sm px-6 py-2">
          Create Day Plan
        </button>
      </div>
    );
  }

  const allPossibilities = tradingDay?.possibilities || [];
  const filteredPossibilities = showNoPlan
    ? allPossibilities
    : allPossibilities.filter((p) => p.has_plan === 1);
  const bullishPossibilities = filteredPossibilities.filter((p) => p.bias === 'Bullish');
  const bearishPossibilities = filteredPossibilities.filter((p) => p.bias === 'Bearish');

  // Plan Analysis sub-view
  if (subView === 'analysis') {
    return (
      <div className="space-y-4">
        <div className="flex gap-1 p-1 bg-surface-800 rounded-lg w-fit">
          <button
            onClick={() => setSubView('plan')}
            className="px-4 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
          >
            New Plan
          </button>
          <button
            onClick={() => setSubView('analysis')}
            className="px-4 py-2 rounded-md text-sm font-medium bg-primary-600 text-white transition-colors"
          >
            Plan Analysis
          </button>
        </div>
        <BehaviorView />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex gap-1 p-1 bg-surface-800 rounded-lg w-fit">
        <button
          onClick={() => setSubView('plan')}
          className="px-4 py-2 rounded-md text-sm font-medium bg-primary-600 text-white transition-colors"
        >
          New Plan
        </button>
        <button
          onClick={() => setSubView('analysis')}
          className="px-4 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
        >
          Plan Analysis
        </button>
      </div>

      {/* Day Notes - Compact */}
      <div className="relative">
        <div className={`flex items-center gap-2 transition-all duration-200 ${notesFocused ? 'glass-card p-3' : 'px-3 py-2 rounded-lg bg-surface-800/50 border border-surface-600/30 hover:border-surface-500/50'}`}>
          <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onFocus={() => setNotesFocused(true)}
            onBlur={() => setNotesFocused(false)}
            placeholder="Add day notes..."
            className={`flex-1 bg-transparent text-sm text-gray-300 placeholder-gray-600 focus:outline-none ${notesFocused ? '' : 'truncate'}`}
          />
          {!notesFocused && !notes && (
            <span className="text-[10px] text-gray-600">optional</span>
          )}
        </div>
      </div>

      {/* Filter toggle */}
      <div className="flex justify-end">
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-gray-400">Show No Plan</span>
          <input
            type="checkbox"
            checked={showNoPlan}
            onChange={(e) => setShowNoPlan(e.target.checked)}
            className="w-4 h-4 rounded border-surface-500 text-primary-500 focus:ring-primary-500/30 bg-surface-700"
          />
        </label>
      </div>

      {/* Bullish Possibilities */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${BIAS_COLORS.Bullish.accent}`}></div>
          <h3 className="section-title text-blue-400">Bullish Default Plans</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {bullishPossibilities.map((p) => {
            const spec = POSSIBILITIES.find((sp) => sp.code === p.code);
            return (
              <PossibilityCard
                key={p.id}
                ref={(el) => { possibilityRefs.current[p.id] = el; }}
                possibility={p}
                spec={spec}
                tradingDay={tradingDay}
                onRefresh={handleRefresh}
              />
            );
          })}
        </div>
      </div>

      {/* Bearish Possibilities */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${BIAS_COLORS.Bearish.accent}`}></div>
          <h3 className="section-title text-red-400">Bearish Default Plans</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {bearishPossibilities.map((p) => {
            const spec = POSSIBILITIES.find((sp) => sp.code === p.code);
            return (
              <PossibilityCard
                key={p.id}
                ref={(el) => { possibilityRefs.current[p.id] = el; }}
                possibility={p}
                spec={spec}
                tradingDay={tradingDay}
                onRefresh={handleRefresh}
              />
            );
          })}
        </div>
      </div>

      {/* Custom Plans */}
      <CustomPlansSection
        ref={customPlansRef}
        tradingDay={tradingDay}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
