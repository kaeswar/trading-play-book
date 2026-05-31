import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { getOutcomeColors } from '../../../shared/constants';
import { useTradingDay } from '../../hooks/useTradingDay';
import { useApp } from '../../store/appStore';
import ScreenshotUploader from './ScreenshotUploader';
import IntradayNotesModal from '../shared/IntradayNotesModal';

const OutcomePanel = forwardRef(function OutcomePanel({ outcome, bias, existingPlan, possibilityId, possibilityCode, tradingDay, onRefresh }, ref) {
  const { saveOutcomePlan } = useTradingDay();
  const { selectedSymbol } = useApp();

  const [target, setTarget] = useState(existingPlan?.target || '');
  const [stopOut, setStopOut] = useState(existingPlan?.stop_out || '');
  const [description, setDescription] = useState(existingPlan?.description || '');
  const [plan, setPlan] = useState(existingPlan || null);
  const [localScreenshots, setLocalScreenshots] = useState(existingPlan?.screenshots || []);
  const [saving, setSaving] = useState(false);
  const [noteCount, setNoteCount] = useState(0);
  const [showNotesModal, setShowNotesModal] = useState(false);

  const colors = getOutcomeColors(outcome, bias);

  const loadNoteCount = async (planId) => {
    if (!planId) return;
    const notes = await window.api.intradayNote.getByOutcomePlan(planId);
    setNoteCount(notes?.length || 0);
  };

  useEffect(() => {
    loadNoteCount(plan?.id);
  }, [plan?.id]);

  // Update plan when existingPlan prop changes (but preserve user's unsaved edits)
  useEffect(() => {
    if (existingPlan) {
      setPlan(existingPlan);
      setLocalScreenshots(existingPlan.screenshots || []);
      if (target === '' || target === (existingPlan.target || '')) {
        setTarget(existingPlan.target || '');
      }
      if (stopOut === '' || stopOut === (existingPlan.stop_out || '')) {
        setStopOut(existingPlan.stop_out || '');
      }
      if (description === '' || description === (existingPlan.description || '')) {
        setDescription(existingPlan.description || '');
      }
    }
  }, [existingPlan]);

  const handleScreenshotRefresh = async () => {
    if (plan) {
      const screenshots = await window.api.screenshot.getByOutcomePlan(plan.id);
      setLocalScreenshots(screenshots || []);
    }
  };

  useImperativeHandle(ref, () => ({
    save: async () => {
      const result = await saveOutcomePlan(
        possibilityId,
        outcome,
        target ? parseFloat(target) : null,
        stopOut ? parseFloat(stopOut) : null,
        description.trim() || null
      );
      if (result) setPlan(result);
    },
  }));

  const handleQuickSave = async () => {
    setSaving(true);
    try {
      const result = await saveOutcomePlan(
        possibilityId,
        outcome,
        target ? parseFloat(target) : null,
        stopOut ? parseFloat(stopOut) : null,
        description.trim() || null
      );
      if (result) {
        setPlan(result);
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleNotesClose = () => {
    setShowNotesModal(false);
    loadNoteCount(plan?.id);
  };

  const notesEntry = plan ? {
    tradingDayId: tradingDay?.id,
    outcomePlanId: plan.id,
    customPlanId: null,
    possibilityCode: possibilityCode || null,
    possibilityLabel: '',
    outcome,
    target: plan.target,
    stopOut: plan.stop_out,
    screenshots: localScreenshots,
    possibilityBias: bias,
    description: plan.description || null,
    isCustom: false,
    tag: null,
  } : null;

  return (
    <div className={`mb-3 p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${colors.text}`}>{outcome}</span>
        <div className="flex items-center gap-1">
          {/* Intra Day Notes button — only shown once outcome plan record exists */}
          {plan && (
            <button
              onClick={() => setShowNotesModal(true)}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors ${
                noteCount > 0
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                  : 'bg-surface-600/40 text-gray-500 border-surface-500/30 hover:bg-surface-600/70 hover:text-gray-300'
              }`}
              title={noteCount > 0 ? `${noteCount} intraday note${noteCount > 1 ? 's' : ''}` : 'Attach intraday notes to this outcome'}
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {noteCount > 0 ? `Notes (${noteCount})` : 'Add Notes'}
            </button>
          )}

          {/* Save button */}
          <button
            onClick={handleQuickSave}
            disabled={saving}
            className="p-1 rounded hover:bg-surface-600/50 text-gray-500 hover:text-primary-400 transition-colors"
            title="Save this outcome"
          >
            {saving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase">Target</label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Price level"
              className="input-field text-xs py-1.5"
              step="any"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase">Stop Out</label>
            <input
              type="number"
              value={stopOut}
              onChange={(e) => setStopOut(e.target.value)}
              placeholder="Price level"
              className="input-field text-xs py-1.5"
              step="any"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-gray-500 mb-1 uppercase">Trade Plan</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional — add context or reasoning..."
            rows={2}
            className="input-field text-xs py-1.5 resize-none w-full"
          />
        </div>

        {plan && (
          <ScreenshotUploader
            outcomePlanId={plan.id}
            screenshots={localScreenshots}
            tradingDay={tradingDay}
            onRefresh={handleScreenshotRefresh}
          />
        )}
      </div>

      {showNotesModal && notesEntry && (
        <IntradayNotesModal
          entry={notesEntry}
          tradingDay={tradingDay}
          customPlans={[]}
          symbolName={selectedSymbol?.name || ''}
          date={tradingDay?.trade_date || ''}
          onClose={handleNotesClose}
          viewOnly={false}
        />
      )}
    </div>
  );
});

export default OutcomePanel;
