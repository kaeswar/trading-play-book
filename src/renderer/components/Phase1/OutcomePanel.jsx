import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { getOutcomeColors } from '../../../shared/constants';
import { useTradingDay } from '../../hooks/useTradingDay';
import ScreenshotUploader from './ScreenshotUploader';

const OutcomePanel = forwardRef(function OutcomePanel({ outcome, bias, existingPlan, possibilityId, tradingDay, onRefresh }, ref) {
  const { saveOutcomePlan } = useTradingDay();

  const [target, setTarget] = useState(existingPlan?.target || '');
  const [stopOut, setStopOut] = useState(existingPlan?.stop_out || '');
  const [description, setDescription] = useState(existingPlan?.description || '');
  const [plan, setPlan] = useState(existingPlan || null);
  const [localScreenshots, setLocalScreenshots] = useState(existingPlan?.screenshots || []);
  const [saving, setSaving] = useState(false);

  const colors = getOutcomeColors(outcome, bias);

  // Update plan when existingPlan prop changes (but preserve user's unsaved edits)
  React.useEffect(() => {
    if (existingPlan) {
      setPlan(existingPlan);
      setLocalScreenshots(existingPlan.screenshots || []);
      // Only set target/stopOut if user hasn't edited them
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

  // Local refresh for screenshot changes - updates screenshots without full data reload
  const handleScreenshotRefresh = async () => {
    if (plan) {
      const screenshots = await window.api.screenshot.getByOutcomePlan(plan.id);
      setLocalScreenshots(screenshots || []);
    }
  };

  // Expose save method to parent
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

  return (
    <div className={`mb-3 p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${colors.text}`}>{outcome}</span>
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

        {/* Trade Plan Description */}
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

        {/* Screenshots */}
        {plan && (
          <ScreenshotUploader
            outcomePlanId={plan.id}
            screenshots={localScreenshots}
            tradingDay={tradingDay}
            onRefresh={handleScreenshotRefresh}
          />
        )}
      </div>
    </div>
  );
});

export default OutcomePanel;
