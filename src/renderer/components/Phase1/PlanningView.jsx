import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../store/appStore';
import { useTradingDay } from '../../hooks/useTradingDay';
import { useDayPlan } from '../../hooks/useDayPlan';
import { useLanguage } from '../../hooks/useLanguage';
import { formatDate } from '../../../shared/constants';
import DayPlanCard from './DayPlanCard';
import PlanStorePicker from './PlanStorePicker';

export default function PlanningView() {
  const { selectedSymbol, selectedDate, showNotification, setSaveDayPlanFn, setSavingDayPlan, refreshDatesFn } = useApp();
  const { createOrGetTradingDay, getTradingDayDetails, updateNotes } = useTradingDay();
  const { getByTradingDay, createFromTemplate } = useDayPlan();
  const { t } = useLanguage();

  const [tradingDay, setTradingDay] = useState(null);
  const [dayPlans, setDayPlans]     = useState([]);
  const [notes, setNotes]           = useState('');
  const [dayLoading, setDayLoading] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  const [dayExists, setDayExists]   = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);

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
        const plans = await getByTradingDay(existing.id);
        setDayPlans(plans);
      } else {
        setDayExists(false);
        setTradingDay(null);
        setDayPlans([]);
      }
    } catch (err) {
      console.error('Failed to load day:', err);
    } finally {
      if (showLoading) setDayLoading(false);
    }
  }, [selectedSymbol, selectedDate]);

  useEffect(() => {
    loadDay(true);
  }, [selectedSymbol, selectedDate]);

  // Empty-state CTA: opens the Plan Store. The atomic createWithPlans IPC is called from
  // handlePickerConfirm when no trading_day exists yet — keeps the rule that a day must
  // have at least one plan.

  // Header "Save Plan" button — saves day notes only now (per-card numbers/outcomes auto-save on blur)
  const handleSaveDayPlan = useCallback(async () => {
    setSavingDayPlan(true);
    try {
      if (tradingDay) {
        await updateNotes(tradingDay.id, notes);
      }
      showNotification('Day notes saved', 'success');
    } catch (err) {
      showNotification('Failed to save', 'error');
    } finally {
      setSavingDayPlan(false);
    }
  }, [tradingDay, notes]);

  useEffect(() => {
    // Only expose the header "Save Day Plan" button once a day actually exists.
    if (dayExists === true) {
      setSaveDayPlanFn(() => handleSaveDayPlan);
    } else {
      setSaveDayPlanFn(null);
    }
    return () => setSaveDayPlanFn(null);
  }, [handleSaveDayPlan, dayExists]);

  const handlePlanChange = useCallback(async () => {
    if (!tradingDay) return;
    const plans = await getByTradingDay(tradingDay.id);
    setDayPlans(plans);
  }, [tradingDay, getByTradingDay]);

  const handlePickerConfirm = async (templateIds) => {
    try {
      if (!tradingDay) {
        // Lazy creation — atomic insert of trading_day + selected plans.
        const res = await window.api.tradingDay.createWithPlans({
          tradeDate: selectedDate,
          symbolId: selectedSymbol.id,
          templateIds,
        });
        if (!res.success) throw new Error(res.error || 'Failed to create day');
        showNotification(`${templateIds.length} plan(s) added`, 'success');
        setPickerOpen(false);
        if (refreshDatesFn) refreshDatesFn();
        await loadDay();
      } else {
        let order = dayPlans.length;
        for (const tplId of templateIds) {
          await createFromTemplate({ tradingDayId: tradingDay.id, templateId: tplId, sortOrder: order++ });
        }
        showNotification(`${templateIds.length} plan(s) added`, 'success');
        setPickerOpen(false);
        await handlePlanChange();
      }
    } catch (err) {
      showNotification(err.message || 'Failed to add plans', 'error');
    }
  };

  if (!selectedSymbol) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{t('selectSymbol')}</p>
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

  if (dayExists === false) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-surface-700 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-gray-300 font-medium">{t('noTradingPlanFor').replace('{date}', formatDate(selectedDate))}</p>
            <p className="text-sm text-gray-500 mt-1 max-w-md">{t('pickPlansForDayHint')}</p>
          </div>
          <button onClick={() => setPickerOpen(true)} className="btn-primary text-sm px-6 py-2">
            {t('pickPlansForDay')}
          </button>
        </div>

        {pickerOpen && (
          <PlanStorePicker
            tradingDay={null}
            onConfirm={handlePickerConfirm}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Day notes */}
      <div className="relative">
        <div className={`flex items-center gap-2 transition-all duration-200 ${
          notesFocused
            ? 'glass-card p-3'
            : 'px-3 py-2 rounded-lg bg-surface-800/50 border border-surface-600/30 hover:border-surface-500/50'
        }`}>
          <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onFocus={() => setNotesFocused(true)}
            onBlur={() => setNotesFocused(false)}
            placeholder={t('addDayNotes')}
            className={`flex-1 bg-transparent text-sm text-gray-300 placeholder-gray-600 focus:outline-none ${notesFocused ? '' : 'truncate'}`}
          />
          {!notesFocused && !notes && (
            <span className="text-[10px] text-gray-600">optional</span>
          )}
        </div>
      </div>

      {/* Today's Plans */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-primary-500 to-cyan-500"></div>
            <h3 className="section-title text-primary-300">{t('todaysPlans')}</h3>
            {dayPlans.length > 0 && (
              <span className="text-[10px] text-gray-500 ml-1">({dayPlans.length})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {dayPlans.length > 0 && (
              <button
                onClick={() => setAllExpanded((v) => !v)}
                className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                {allExpanded ? 'Shrink All' : 'Expand All'}
              </button>
            )}
            <button
              onClick={() => setPickerOpen(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary-600/20 border border-primary-500/30 text-primary-300 hover:bg-primary-600/30 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('pickFromStore')}
            </button>
          </div>
        </div>

        {dayPlans.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-gray-500">{t('noPlansForToday')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dayPlans.map((plan) => (
              <DayPlanCard
                key={plan.id}
                dayPlan={plan}
                tradingDay={tradingDay}
                isLastPlan={dayPlans.length === 1}
                expandedOverride={allExpanded}
                onChange={handlePlanChange}
                onDayDeleted={() => { loadDay(true); if (refreshDatesFn) refreshDatesFn(); }}
              />
            ))}
          </div>
        )}
      </div>

      {pickerOpen && (
        <PlanStorePicker
          tradingDay={tradingDay}
          onConfirm={handlePickerConfirm}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
