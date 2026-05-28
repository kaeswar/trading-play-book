import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { useCustomPlan } from '../../hooks/useCustomPlan';
import { useApp } from '../../store/appStore';
import { CUSTOM_VERDICT_STATUSES, CUSTOM_VERDICT_COLORS, CUSTOM_PLAN_BIAS_TAGS, BEHAVIOR_TAGS } from '../../../shared/constants';
import CustomPlanScreenshotUploader from './CustomPlanScreenshotUploader';

const CustomPlanCard = forwardRef(function CustomPlanCard({ customPlan, tradingDay, onRefresh, onDelete }, ref) {
  const { updateCustomPlan, saveCustomPlanVerdict } = useCustomPlan();
  const { showNotification } = useApp();

  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(customPlan.title || '');
  const [tradePlan, setTradePlan] = useState(customPlan.trade_plan || '');
  const [biasTag, setBiasTag] = useState(customPlan.bias_tag || null);
  const [target, setTarget] = useState(customPlan.target ?? '');
  const [stopOut, setStopOut] = useState(customPlan.stop_out ?? '');
  const [verdictStatus, setVerdictStatus] = useState(customPlan.verdict_status || null);
  const [verdictNotes, setVerdictNotes] = useState(customPlan.verdict_notes || '');
  const [saving, setSaving] = useState(false);
  const [screenshots, setScreenshots] = useState(customPlan.screenshots || []);

  // Sync screenshots from props when customPlan changes
  React.useEffect(() => {
    setScreenshots(customPlan.screenshots || []);
  }, [customPlan.screenshots]);

  React.useEffect(() => {
    setTitle(customPlan.title || '');
    setTradePlan(customPlan.trade_plan || '');
    setBiasTag(customPlan.bias_tag || null);
    setTarget(customPlan.target ?? '');
    setStopOut(customPlan.stop_out ?? '');
    setVerdictStatus(customPlan.verdict_status || null);
    setVerdictNotes(customPlan.verdict_notes || '');
  }, [customPlan]);

  const handleSave = async () => {
    if (!title.trim()) {
      showNotification('Title is required', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateCustomPlan(customPlan.id, {
        title: title.trim(),
        tradePlan: tradePlan.trim(),
        biasTag,
        target: target !== '' ? parseFloat(target) || null : null,
        stopOut: stopOut !== '' ? parseFloat(stopOut) || null : null,
      });
      showNotification('Custom plan saved', 'success');
    } catch (err) {
      showNotification('Failed to save custom plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleVerdictSave = async (status) => {
    const newStatus = verdictStatus === status ? null : status;
    setVerdictStatus(newStatus);
    try {
      await saveCustomPlanVerdict(customPlan.id, {
        verdictStatus: newStatus,
        verdictNotes,
      });
    } catch (err) {
      showNotification('Failed to save verdict', 'error');
    }
  };

  const handleVerdictNotesBlur = async () => {
    if (verdictStatus) {
      try {
        await saveCustomPlanVerdict(customPlan.id, {
          verdictStatus,
          verdictNotes,
        });
      } catch (err) {
        // silent save
      }
    }
  };

  const handleScreenshotRefresh = async () => {
    const fresh = await window.api.customPlanScreenshot.getByCustomPlan(customPlan.id);
    setScreenshots(fresh);
  };

  // Expose save() for bulk save from parent
  useImperativeHandle(ref, () => ({
    save: handleSave,
  }));

  const hasVerdict = !!verdictStatus;
  const verdictColors = verdictStatus ? CUSTOM_VERDICT_COLORS[verdictStatus] : null;

  return (
    <div className="glass-card overflow-hidden">
      {/* Header - always visible */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-700/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-purple-500 to-fuchsia-500 flex-shrink-0"></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-200 truncate">{title || 'Untitled Plan'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {target !== '' && target !== null && (
                <span className="text-[10px] text-emerald-400">T: {target}</span>
              )}
              {stopOut !== '' && stopOut !== null && (
                <span className="text-[10px] text-red-400">SL: {stopOut}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {biasTag && (() => {
            const tagColors = BEHAVIOR_TAGS[biasTag];
            return tagColors ? (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${tagColors.bg} ${tagColors.text} ${tagColors.border} border`}>
                {biasTag}
              </span>
            ) : null;
          })()}
          {hasVerdict && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${verdictColors.bg} ${verdictColors.text} ${verdictColors.border} border`}>
              {verdictStatus}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-surface-600/30">
          {/* Title */}
          <div className="pt-3">
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your plan a name..."
              className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500/50"
            />
          </div>

          {/* Trade Plan Text */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Trade Plan</label>
            <textarea
              value={tradePlan}
              onChange={(e) => setTradePlan(e.target.value)}
              placeholder="Describe your trade plan..."
              rows={3}
              className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500/50 resize-none"
            />
          </div>

          {/* Bias Tag */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase mb-2 block">Bias Tag</label>
            <div className="flex flex-wrap gap-2">
              {CUSTOM_PLAN_BIAS_TAGS.map((tag) => {
                const colors = BEHAVIOR_TAGS[tag];
                const isActive = biasTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setBiasTag(isActive ? null : tag)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      isActive
                        ? `${colors.bg} ${colors.text} ${colors.border} font-medium`
                        : 'bg-surface-800 border-surface-600 text-gray-400 hover:border-surface-500'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target & Stop Out */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase mb-1 block">Target</label>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Target level"
                step="any"
                className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase mb-1 block">Stop Out</label>
              <input
                type="number"
                value={stopOut}
                onChange={(e) => setStopOut(e.target.value)}
                placeholder="Stop loss level"
                step="any"
                className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500/50"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Plan'}
            </button>
          </div>

          {/* Screenshots */}
          <CustomPlanScreenshotUploader
            customPlanId={customPlan.id}
            screenshots={screenshots}
            tradingDay={tradingDay}
            onRefresh={handleScreenshotRefresh}
          />

          {/* Verdict Section */}
          <div className="pt-2 border-t border-surface-600/30">
            <label className="text-[10px] text-gray-500 uppercase mb-2 block">Verdict</label>
            <div className="flex gap-2 mb-3">
              {CUSTOM_VERDICT_STATUSES.map((status) => {
                const colors = CUSTOM_VERDICT_COLORS[status];
                const isActive = verdictStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => handleVerdictSave(status)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      isActive
                        ? `${colors.bg} ${colors.text} ${colors.border} font-medium`
                        : 'bg-surface-800 border-surface-600 text-gray-400 hover:border-surface-500'
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
            {verdictStatus && (
              <textarea
                value={verdictNotes}
                onChange={(e) => setVerdictNotes(e.target.value)}
                onBlur={handleVerdictNotesBlur}
                placeholder="Add verdict notes..."
                rows={2}
                className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500/50 resize-none"
              />
            )}
          </div>

          {/* Delete button */}
          <div className="flex justify-end pt-1">
            <button
              onClick={() => onDelete(customPlan.id)}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default CustomPlanCard;
