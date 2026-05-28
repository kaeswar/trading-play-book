import React, { useState, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { BIAS_COLORS, OUTCOMES, OUTCOME_COLORS, getOutcomeColors, formatPossibilityCode } from '../../../shared/constants';
import OutcomePanel from './OutcomePanel';
import { useTradingDay } from '../../hooks/useTradingDay';
import { useApp } from '../../store/appStore';

const PossibilityCard = forwardRef(function PossibilityCard({ possibility, spec, tradingDay, onRefresh }, ref) {
  const { markNoPlan, markHasPlan, saveOutcomePlan } = useTradingDay();
  const { showNotification } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [showOutcomes, setShowOutcomes] = useState(possibility.has_plan === 1);
  const [localOutcomePlans, setLocalOutcomePlans] = useState(possibility.outcomePlans || []);
  const [creatingPlans, setCreatingPlans] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync outcomePlans from props when data refreshes (e.g. after screenshot upload)
  useEffect(() => {
    if (possibility.outcomePlans && possibility.outcomePlans.length > 0) {
      setLocalOutcomePlans(possibility.outcomePlans);
    }
  }, [possibility.outcomePlans]);
  const [selectedOutcome, setSelectedOutcome] = useState(null); // null = show all
  const outcomeRefs = useRef({});

  // Check if any outcome plan has actual values (target, stop_out, or screenshots)
  const hasActualData = localOutcomePlans.some((op) => {
    const hasTarget = op.target != null && op.target !== '' && op.target !== 0;
    const hasStopOut = op.stop_out != null && op.stop_out !== '' && op.stop_out !== 0;
    const hasScreenshots = op.screenshots && op.screenshots.length > 0;
    return hasTarget || hasStopOut || hasScreenshots;
  });

  // Show as planned only when there's actual data entered
  const isPlanned = hasActualData;
  const biasColor = BIAS_COLORS[possibility.bias];

  // Expose saveAll to parent
  useImperativeHandle(ref, () => ({
    saveAll: async () => {
      const refs = Object.values(outcomeRefs.current);
      for (const r of refs) {
        if (r?.save) await r.save();
      }
    },
  }));

  // When expanding for first time, create all 3 outcome plans sequentially
  useEffect(() => {
    if (showOutcomes && localOutcomePlans.length === 0 && !creatingPlans) {
      setCreatingPlans(true);
      const createAll = async () => {
        const plans = [];
        for (const outcome of OUTCOMES) {
          const existing = localOutcomePlans.find((op) => op.outcome === outcome);
          if (existing) {
            plans.push(existing);
          } else {
            const result = await saveOutcomePlan(possibility.id, outcome, null, null);
            if (result) plans.push(result);
          }
        }
        setLocalOutcomePlans(plans);
        setCreatingPlans(false);
      };
      createAll();
    }
  }, [showOutcomes]);

  const handleNoPlan = async () => {
    await markNoPlan(possibility.id);
    setShowOutcomes(false);
    setExpanded(false);
    showNotification('Marked as No Plan', 'info');
    onRefresh();
  };

  const handleStartPlanning = async () => {
    await markHasPlan(possibility.id);
    setShowOutcomes(true);
    setExpanded(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const refs = Object.values(outcomeRefs.current);
      for (const r of refs) {
        if (r?.save) await r.save();
      }
      showNotification('Possibility saved', 'success');
      onRefresh();
    } catch (err) {
      showNotification('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOutcomeClick = (e, oc) => {
    e.stopPropagation();
    if (selectedOutcome === oc) {
      setExpanded(false); // collapse
      setSelectedOutcome(null);
    } else {
      setSelectedOutcome(oc);
      setExpanded(true);
    }
  };

  const handleHeaderClick = () => {
    if (expanded) {
      setExpanded(false);
      setSelectedOutcome(null);
    } else {
      setExpanded(true);
      setSelectedOutcome(null); // show all when clicking header
    }
  };

  // Determine which outcomes to show
  const outcomesToShow = selectedOutcome ? [selectedOutcome] : OUTCOMES;

  // Show minimal card if not planned and not actively editing
  if (!isPlanned && (!showOutcomes || !expanded)) {
    return (
      <div className="glass-card p-4 opacity-60 hover:opacity-100 transition-opacity">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <span className={`badge text-[10px] mb-2 ${biasColor.bg} ${biasColor.text} border ${biasColor.border}`}>
              {possibility.bias}
            </span>
            <h4 className="text-sm font-medium text-gray-300 mt-1">{spec?.label || formatPossibilityCode(possibility.code)}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{formatPossibilityCode(possibility.code)}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleStartPlanning} className="btn-primary text-xs flex-1">
            Create Plan
          </button>
          <button onClick={handleNoPlan} className="btn-secondary text-xs">
            No Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card overflow-hidden border-l-2 ${
      isPlanned ? 'border-l-primary-500' : 'border-l-gray-600'
    }`}>
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-surface-700/50 transition-colors"
        onClick={handleHeaderClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`badge text-[10px] ${biasColor.bg} ${biasColor.text} border ${biasColor.border}`}>
                {possibility.bias}
              </span>
              {isPlanned && (
                <span className="badge text-[10px] bg-primary-500/20 text-primary-400 border border-primary-500/30">
                  Planned
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-gray-200 mt-1">{spec?.label || formatPossibilityCode(possibility.code)}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{formatPossibilityCode(possibility.code)}</p>
            {/* Clickable outcome badges */}
            {isPlanned && localOutcomePlans.length > 0 && (
              <div className="flex gap-2 mt-2">
                {OUTCOMES.map((oc) => {
                  const has = localOutcomePlans.some((op) => op.outcome === oc);
                  const isSelected = selectedOutcome === oc;
                  return (
                    <button
                      key={oc}
                      onClick={(e) => handleOutcomeClick(e, oc)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                        isSelected
                          ? `${getOutcomeColors(oc, possibility.bias).bg} ${getOutcomeColors(oc, possibility.bias).text} ${getOutcomeColors(oc, possibility.bias).border} font-semibold`
                          : has
                            ? `${getOutcomeColors(oc, possibility.bias).bg} ${getOutcomeColors(oc, possibility.bias).text} border-transparent opacity-50 hover:opacity-80`
                            : 'bg-surface-600 text-gray-500 border-transparent opacity-50 hover:opacity-75'
                      }`}
                    >
                      {oc}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-surface-600/50 p-4">
          {creatingPlans ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <>
              {/* Show selected outcome or all */}
              {outcomesToShow.map((outcome) => {
                const existingPlan = localOutcomePlans.find((op) => op.outcome === outcome);
                return (
                  <OutcomePanel
                    key={outcome}
                    ref={(el) => { outcomeRefs.current[outcome] = el; }}
                    outcome={outcome}
                    bias={possibility.bias}
                    existingPlan={existingPlan}
                    possibilityId={possibility.id}
                    tradingDay={tradingDay}
                    onRefresh={onRefresh}
                  />
                );
              })}

              {/* Save button for this possibility */}
              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-surface-600/30">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary text-xs px-4 py-1.5"
                >
                  {saving ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default PossibilityCard;
