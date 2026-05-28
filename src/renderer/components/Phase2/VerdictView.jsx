import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../store/appStore';
import { useTradingDay } from '../../hooks/useTradingDay';
import { useVerdict } from '../../hooks/useVerdict';
import { POSSIBILITIES, OUTCOMES, BIAS_COLORS, OUTCOME_COLORS, CUSTOM_VERDICT_STATUSES, CUSTOM_VERDICT_COLORS, BEHAVIOR_TAGS, getOutcomeColors, formatPossibilityCode, formatDate } from '../../../shared/constants';
import { useCustomPlan } from '../../hooks/useCustomPlan';
import VerdictForm from './VerdictForm';

export default function VerdictView() {
  const { selectedSymbol, selectedDate, showNotification } = useApp();
  const { createOrGetTradingDay, getTradingDayDetails } = useTradingDay();
  const { saveVerdict, getVerdict, getVerdictScreenshots, saveVerdictScreenshots } = useVerdict();

  const [tradingDay, setTradingDay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [verdictScreenshots, setVerdictScreenshots] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [customPlans, setCustomPlans] = useState([]);
  const { getCustomPlans: loadCustomPlans, saveCustomPlanVerdict } = useCustomPlan();

  const loadDay = useCallback(async () => {
    if (!selectedSymbol || !selectedDate) return;
    setLoading(true);
    try {
      const day = await createOrGetTradingDay(selectedDate, selectedSymbol.id);
      if (day) {
        const details = await getTradingDayDetails(day.id);
        setTradingDay(details);
        setVerdict(details?.verdict || null);

        // Load verdict screenshots if verdict exists
        if (details?.verdict) {
          const screenshots = await getVerdictScreenshots(details.verdict.id);
          setVerdictScreenshots(screenshots);
        } else {
          setVerdictScreenshots([]);
        }

        // Load custom plans
        const plans = await loadCustomPlans(day.id);
        setCustomPlans(plans);
      }
    } catch (err) {
      console.error('Failed to load day:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol, selectedDate]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  const handleSaveVerdict = async ({ possibilityCode, outcome, bias, notes, screenshots }) => {
    const result = await saveVerdict({
      tradingDayId: tradingDay.id,
      possibilityCode,
      outcome,
      bias,
      notes,
    });

    if (result) {
      // Save screenshots
      if (result.verdict) {
        await saveVerdictScreenshots(result.verdict.id, screenshots || [], verdictScreenshots);
        // Reload screenshots
        const updatedScreenshots = await getVerdictScreenshots(result.verdict.id);
        setVerdictScreenshots(updatedScreenshots);
      }

      setVerdict(result.verdict);
      setShowForm(false);

      if (result.wasUpdate) {
        showNotification('Verdict updated', 'success');
      } else if (!result.hadPlan) {
        showNotification('Verdict recorded — noted as no plan day', 'info');
      } else {
        showNotification('Verdict saved', 'success');
      }
    } else {
      showNotification('Failed to save verdict', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading verdict...</p>
        </div>
      </div>
    );
  }

  if (!tradingDay) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">End-of-Day Verdict</h3>
          <p className="text-sm text-gray-500">
            Select a symbol and date to record your trading verdict
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
            End-of-Day Verdict
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {selectedSymbol.name} &middot; {formatDate(selectedDate)}
          </p>
        </div>
        {verdict && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-secondary text-sm"
          >
            Edit Verdict
          </button>
        )}
      </div>

      {/* Show form if no verdict or user clicked edit */}
      {(!verdict || showForm) ? (
        <div className="card">
          <VerdictForm
            tradingDay={tradingDay}
            existingVerdict={verdict}
            existingScreenshots={verdictScreenshots}
            onSave={handleSaveVerdict}
            onCancel={verdict ? () => setShowForm(false) : null}
          />
        </div>
      ) : (
        <VerdictDisplay
          verdict={verdict}
          screenshots={verdictScreenshots}
        />
      )}

      {/* Custom Plan Verdicts */}
      {customPlans.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500"></div>
            <h3 className="text-sm font-medium text-gray-300">Custom Plan Verdicts</h3>
            <span className="text-[10px] text-gray-500">({customPlans.length})</span>
          </div>
          {customPlans.map((plan) => (
            <CustomPlanVerdictCard
              key={plan.id}
              plan={plan}
              onVerdictUpdate={loadDay}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VerdictDisplay({ verdict, screenshots = [] }) {
  const possibility = POSSIBILITIES.find((p) => p.code === verdict.possibility_code);
  const biasColors = possibility ? BIAS_COLORS[possibility.bias] : null;
  const outcomeColors = getOutcomeColors(verdict.outcome, possibility?.bias);
  const [viewerSrc, setViewerSrc] = useState(null);

  const handleViewScreenshot = async (filePath) => {
    const fullPath = await window.api.image.getFullPath(filePath);
    if (fullPath) {
      const dataUrl = await window.api.image.toDataUrl(fullPath);
      if (dataUrl) setViewerSrc(dataUrl);
    }
  };

  return (
    <div className="space-y-4">
      {/* Verdict Card */}
      <div className="card">
        <div className="space-y-4">
          {/* Possibility + Outcome */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 p-3 bg-surface-700/50 rounded-lg border border-surface-500">
              <p className="text-[10px] text-gray-500 uppercase mb-1">Opening Scenario</p>
              <div className="flex items-center gap-2">
                {biasColors && (
                  <span className={`badge text-[10px] ${biasColors.bg} ${biasColors.text} border ${biasColors.border}`}>
                    {possibility.bias}
                  </span>
                )}
                <p className="text-sm font-medium text-gray-200">
                  {formatPossibilityCode(verdict.possibility_code)}
                </p>
              </div>
              {possibility && (
                <p className="text-xs text-gray-500 mt-1">{possibility.label}</p>
              )}
            </div>

            <div className="flex-1 p-3 bg-surface-700/50 rounded-lg border border-surface-500">
              <p className="text-[10px] text-gray-500 uppercase mb-1">Outcome</p>
              <p className={`text-lg font-bold ${outcomeColors.text}`}>
                {verdict.outcome}
              </p>
            </div>

            <div className="flex-1 p-3 bg-surface-700/50 rounded-lg border border-surface-500">
              <p className="text-[10px] text-gray-500 uppercase mb-1">Plan Status</p>
              <p className={`text-sm font-medium ${verdict.had_plan ? 'text-emerald-400' : 'text-gray-400'}`}>
                {verdict.had_plan ? 'Had Plan' : 'No Plan'}
              </p>
            </div>
          </div>

          {/* Notes */}
          {verdict.notes && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase mb-1">Notes</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{verdict.notes}</p>
            </div>
          )}

          {/* Screenshots */}
          {screenshots.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase mb-2">Screenshots</p>
              <div className="flex gap-2 flex-wrap">
                {screenshots.map((ss) => (
                  <VerdictScreenshotThumb
                    key={ss.id}
                    filePath={ss.file_path}
                    onClick={() => handleViewScreenshot(ss.file_path)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="pt-3 border-t border-surface-500">
            <p className="text-[10px] text-gray-600">
              Recorded {verdict.entered_at ? new Date(verdict.entered_at).toLocaleString() : 'just now'}
              {verdict.updated_at !== verdict.entered_at && (
                <span> &middot; Updated {new Date(verdict.updated_at).toLocaleString()}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Full-size image viewer */}
      {viewerSrc && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-pointer"
          onClick={() => setViewerSrc(null)}
        >
          <img src={viewerSrc} alt="Screenshot" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
          <button
            onClick={() => setViewerSrc(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-surface-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function VerdictScreenshotThumb({ filePath, onClick }) {
  const [src, setSrc] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    window.api.image.getFullPath(filePath).then(async (fullPath) => {
      if (fullPath) {
        const dataUrl = await window.api.image.toDataUrl(fullPath);
        if (dataUrl) setSrc(dataUrl);
      }
    });
  }, [filePath]);

  return (
    <button
      onClick={onClick}
      className="relative w-16 h-16 rounded-lg overflow-hidden border border-surface-500/60 hover:border-primary-400/60 transition-all duration-200 hover:shadow-md hover:shadow-primary-500/10 hover:scale-105"
    >
      {src ? (
        <>
          <img
            src={src}
            alt="Screenshot"
            className={`w-full h-full object-cover transition-all duration-200 hover:brightness-75 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setSrc(null)}
          />
          {!loaded && (
            <div className="absolute inset-0 bg-surface-700 animate-pulse rounded-lg" />
          )}
        </>
      ) : (
        <div className="w-full h-full bg-surface-700 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
      )}
    </button>
  );
}

function CustomPlanVerdictCard({ plan, onVerdictUpdate }) {
  const { saveCustomPlanVerdict } = useCustomPlan();
  const [verdictStatus, setVerdictStatus] = useState(plan.verdict_status || null);
  const [verdictNotes, setVerdictNotes] = useState(plan.verdict_notes || '');
  const [editingNotes, setEditingNotes] = useState(false);

  const handleStatusClick = async (status) => {
    const newStatus = verdictStatus === status ? null : status;
    setVerdictStatus(newStatus);
    try {
      await saveCustomPlanVerdict(plan.id, { verdictStatus: newStatus, verdictNotes });
      if (onVerdictUpdate) onVerdictUpdate();
    } catch (err) {
      console.error('Failed to save verdict:', err);
    }
  };

  const handleNotesSave = async () => {
    try {
      await saveCustomPlanVerdict(plan.id, { verdictStatus, verdictNotes });
      setEditingNotes(false);
      if (onVerdictUpdate) onVerdictUpdate();
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  const verdictColors = verdictStatus ? CUSTOM_VERDICT_COLORS[verdictStatus] : null;
  const biasColors = plan.bias_tag ? BEHAVIOR_TAGS[plan.bias_tag] : null;

  return (
    <div className="card">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-purple-500 to-fuchsia-500 flex-shrink-0"></div>
            <p className="text-sm text-gray-200 truncate">{plan.title || 'Untitled Plan'}</p>
            {biasColors && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${biasColors.bg} ${biasColors.text} ${biasColors.border} border flex-shrink-0`}>
                {plan.bias_tag}
              </span>
            )}
          </div>
          {verdictColors && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${verdictColors.bg} ${verdictColors.text} ${verdictColors.border} border flex-shrink-0`}>
              {verdictStatus}
            </span>
          )}
        </div>

        {/* Target / Stop Out */}
        {(plan.target != null || plan.stop_out != null) && (
          <div className="flex gap-4">
            {plan.target != null && (
              <span className="text-xs text-emerald-400">Target: {plan.target}</span>
            )}
            {plan.stop_out != null && (
              <span className="text-xs text-red-400">Stop Out: {plan.stop_out}</span>
            )}
          </div>
        )}

        {/* Verdict Status Buttons */}
        <div>
          <p className="text-[10px] text-gray-500 uppercase mb-2">Verdict</p>
          <div className="flex gap-2">
            {CUSTOM_VERDICT_STATUSES.map((status) => {
              const colors = CUSTOM_VERDICT_COLORS[status];
              const isActive = verdictStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => handleStatusClick(status)}
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
        </div>

        {/* Verdict Notes */}
        {verdictStatus && (
          <div>
            {editingNotes || !verdictNotes ? (
              <div className="flex gap-2">
                <textarea
                  value={verdictNotes}
                  onChange={(e) => setVerdictNotes(e.target.value)}
                  placeholder="Add verdict notes..."
                  rows={2}
                  className="flex-1 bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500/50 resize-none"
                />
                <button
                  onClick={handleNotesSave}
                  className="self-end text-xs px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            ) : (
              <p
                className="text-sm text-gray-400 cursor-pointer hover:text-gray-300"
                onClick={() => setEditingNotes(true)}
              >
                {verdictNotes}
                <span className="text-[10px] text-gray-600 ml-2">(click to edit)</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}