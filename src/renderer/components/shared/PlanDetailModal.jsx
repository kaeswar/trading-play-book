import React, { useState, useEffect } from 'react';
import { POSSIBILITIES, OUTCOME_COLORS, BIAS_COLORS, CUSTOM_VERDICT_COLORS, BEHAVIOR_TAGS, INTRADAY_STATUS_COLORS, getOutcomeColors, formatPossibilityCode } from '../../../shared/constants';

export default function PlanDetailModal({ plan, type, verdict, outcomePlanId, symbolName, tradeDate, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (type === 'custom') {
    return <CustomPlanDetailModal plan={plan} symbolName={symbolName} tradeDate={tradeDate} onClose={onClose} />;
  }
  return <DefaultPlanDetailModal plan={plan} verdict={verdict} outcomePlanId={outcomePlanId} symbolName={symbolName} tradeDate={tradeDate} onClose={onClose} />;
}

function DefaultPlanDetailModal({ plan, verdict, outcomePlanId, symbolName, tradeDate, onClose }) {
  const spec = POSSIBILITIES.find((sp) => sp.code === plan.code);
  const biasColor = BIAS_COLORS[plan.bias];
  const isVerdict = verdict?.possibility_code === plan.code;
  const hasPlan = plan.has_plan === 1;
  const verdictOutcome = verdict?.outcome;

  // If outcomePlanId is set, focus on that specific outcome
  const focusedOutcome = outcomePlanId
    ? plan.outcomePlans?.find(op => op.id === outcomePlanId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card w-full max-w-3xl max-h-[90vh] mx-4 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-surface-800/95 backdrop-blur border-b border-surface-600/30">
          <div className="flex items-center gap-3">
            <span className={`badge text-xs ${biasColor.bg} ${biasColor.text} border ${biasColor.border}`}>
              {plan.bias}
            </span>
            {isVerdict && (
              <span className="badge text-xs bg-primary-500/20 text-primary-400 border border-primary-500/30">Verdict</span>
            )}
            {hasPlan ? (
              <span className="badge text-xs bg-emerald-500/20 text-emerald-400">Planned</span>
            ) : (
              <span className="badge text-xs bg-gray-500/20 text-gray-500">No Plan</span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Plan Title */}
          <div>
            <h2 className="text-lg font-semibold text-gray-100">{formatPossibilityCode(plan.code)}</h2>
            {spec && <p className="text-sm text-gray-400 mt-1">{spec.label}</p>}
          </div>

          {/* Focused Outcome View */}
          {focusedOutcome ? (
            <OutcomeDetailView
              outcome={focusedOutcome}
              bias={plan.bias}
              isVerdictOutcome={isVerdict && focusedOutcome.outcome === verdictOutcome}
              outcomePlanId={outcomePlanId}
              symbolName={symbolName}
              tradeDate={tradeDate}
            />
          ) : hasPlan && plan.outcomePlans && plan.outcomePlans.length > 0 ? (
            <div className="space-y-4">
              {plan.outcomePlans.map((op) => {
                const colors = getOutcomeColors(op.outcome, plan.bias);
                const isVerdictOutcome = isVerdict && op.outcome === verdictOutcome;
                return (
                  <div key={op.id} className={`rounded-xl border p-4 ${isVerdictOutcome ? 'ring-2 ring-primary-500/40' : ''} ${colors.border} ${colors.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${colors.text}`}>{op.outcome}</span>
                      {isVerdictOutcome && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/30">Verdict Outcome</span>
                      )}
                    </div>
                    <div className="flex gap-6 mb-3">
                      {op.target != null && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Target</p>
                          <p className="text-base font-semibold text-emerald-400">{op.target}</p>
                        </div>
                      )}
                      {op.stop_out != null && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Stop Out</p>
                          <p className="text-base font-semibold text-red-400">{op.stop_out}</p>
                        </div>
                      )}
                    </div>
                    {op.screenshots && op.screenshots.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase mb-2">Screenshots</p>
                        <div className="flex flex-wrap gap-2">
                          {op.screenshots.map((ss) => <ModalScreenshotThumb key={ss.id} filePath={ss.file_path} />)}
                        </div>
                      </div>
                    )}
                    {(!op.screenshots || op.screenshots.length === 0) && op.target == null && op.stop_out == null && (
                      <p className="text-xs text-gray-500">No data entered for this outcome.</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No plan was created for this scenario.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Focused Outcome Detail with Intraday Notes (read-only) ─── */
function OutcomeDetailView({ outcome, bias, isVerdictOutcome, outcomePlanId, symbolName, tradeDate }) {
  const colors = getOutcomeColors(outcome.outcome, bias);
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoadingNotes(true);
      try {
        const data = await window.api.intradayNote.getByOutcomePlan(outcomePlanId);
        const notesWithScreenshots = [];
        for (const note of data) {
          const screenshots = await window.api.intradayNoteScreenshot.getByIntradayNote(note.id);
          notesWithScreenshots.push({ ...note, screenshots });
        }
        setNotes(notesWithScreenshots);
      } catch (e) { /* ignore */ }
      setLoadingNotes(false);
    };
    load();
  }, [outcomePlanId]);

  return (
    <div className="space-y-5">
      {/* Outcome Header */}
      <div className={`rounded-xl border p-4 ${isVerdictOutcome ? 'ring-2 ring-primary-500/40' : ''} ${colors.border} ${colors.bg}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-semibold ${colors.text}`}>{outcome.outcome}</span>
          {isVerdictOutcome && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/30">Verdict Outcome</span>
          )}
        </div>
        <div className="flex gap-6 mb-3">
          {outcome.target != null && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Target</p>
              <p className="text-2xl font-bold text-emerald-400">{outcome.target}</p>
            </div>
          )}
          {outcome.stop_out != null && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Stop Out</p>
              <p className="text-2xl font-bold text-red-400">{outcome.stop_out}</p>
            </div>
          )}
        </div>
        {outcome.screenshots && outcome.screenshots.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase mb-2">Screenshots</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {outcome.screenshots.map((ss) => <ModalScreenshotThumb key={ss.id} filePath={ss.file_path} />)}
            </div>
          </div>
        )}
      </div>

      {/* Intraday Notes (read-only) */}
      <IntradayNotesReadOnly notes={notes} loading={loadingNotes} />
    </div>
  );
}

/* ─── Custom Plan Detail with Intraday Notes ─── */
function CustomPlanDetailModal({ plan, symbolName, tradeDate, onClose }) {
  const verdictColors = plan.verdict_status ? CUSTOM_VERDICT_COLORS[plan.verdict_status] : null;
  const biasColors = plan.bias_tag ? BEHAVIOR_TAGS[plan.bias_tag] : null;
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoadingNotes(true);
      try {
        const data = await window.api.intradayNote.getByCustomPlan(plan.id);
        const notesWithScreenshots = [];
        for (const note of data) {
          const screenshots = await window.api.intradayNoteScreenshot.getByIntradayNote(note.id);
          notesWithScreenshots.push({ ...note, screenshots });
        }
        setNotes(notesWithScreenshots);
      } catch (e) { /* ignore */ }
      setLoadingNotes(false);
    };
    load();
  }, [plan.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card w-full max-w-3xl max-h-[90vh] mx-4 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-surface-800/95 backdrop-blur border-b border-surface-600/30">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-purple-500 to-fuchsia-500"></div>
            <h2 className="text-lg font-semibold text-gray-100">{plan.title || 'Untitled Plan'}</h2>
            {biasColors && (
              <span className={`text-xs px-2.5 py-1 rounded-full ${biasColors.bg} ${biasColors.text} ${biasColors.border} border`}>{plan.bias_tag}</span>
            )}
            {verdictColors && (
              <span className={`text-xs px-2.5 py-1 rounded-full ${verdictColors.bg} ${verdictColors.text} ${verdictColors.border} border`}>{plan.verdict_status}</span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-700 hover:bg-surface-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Trade Plan */}
          {plan.trade_plan && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase mb-1">Trade Plan</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{plan.trade_plan}</p>
            </div>
          )}

          {/* Target / Stop Out */}
          {(plan.target != null || plan.stop_out != null) && (
            <div className="flex gap-8">
              {plan.target != null && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase mb-1">Target</p>
                  <p className="text-2xl font-bold text-emerald-400">{plan.target}</p>
                </div>
              )}
              {plan.stop_out != null && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase mb-1">Stop Out</p>
                  <p className="text-2xl font-bold text-red-400">{plan.stop_out}</p>
                </div>
              )}
            </div>
          )}

          {/* Verdict */}
          {plan.verdict_status && (
            <div className="p-4 rounded-xl bg-surface-700/50 border border-surface-600/30">
              <p className="text-[10px] text-gray-500 uppercase mb-2">Verdict</p>
              <span className={`text-sm px-3 py-1.5 rounded-full ${verdictColors.bg} ${verdictColors.text} ${verdictColors.border} border font-medium`}>{plan.verdict_status}</span>
              {plan.verdict_notes && <p className="text-sm text-gray-400 mt-3 whitespace-pre-wrap">{plan.verdict_notes}</p>}
            </div>
          )}

          {/* Screenshots */}
          {plan.screenshots && plan.screenshots.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase mb-3">Screenshots</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {plan.screenshots.map((ss) => <ModalScreenshotThumb key={ss.id} filePath={ss.file_path} />)}
              </div>
            </div>
          )}

          {/* Intraday Notes (read-only) */}
          <IntradayNotesReadOnly notes={notes} loading={loadingNotes} />

          {(!plan.screenshots || plan.screenshots.length === 0) && !plan.trade_plan && plan.target == null && plan.stop_out == null && notes.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No data entered for this plan yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Intraday Notes Read-Only View ─── */
function IntradayNotesReadOnly({ notes, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (notes.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-[10px] text-gray-500 uppercase font-medium">Intraday Notes</p>
        <span className="text-[10px] text-gray-600">({notes.length})</span>
      </div>

      <table className="w-full border-collapse border border-surface-600/30 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-surface-800/60">
            <th className="text-[10px] text-gray-500 uppercase font-medium text-left px-2 py-1.5 border-b border-surface-600/40 w-[80px]">Time</th>
            <th className="text-[10px] text-gray-500 uppercase font-medium text-left px-2 py-1.5 border-b border-surface-600/40">Action</th>
            <th className="text-[10px] text-gray-500 uppercase font-medium text-left px-2 py-1.5 border-b border-surface-600/40 w-[120px]">Status</th>
            <th className="text-[10px] text-gray-500 uppercase font-medium text-left px-2 py-1.5 border-b border-surface-600/40 w-[70px]">Proof</th>
          </tr>
        </thead>
        <tbody>
          {notes.map((note) => {
            const statusColors = INTRADAY_STATUS_COLORS[note.status] || INTRADAY_STATUS_COLORS['Not-Known'];
            return (
              <tr key={note.id} className="hover:bg-surface-700/20">
                <td className="px-2 py-1.5 border-b border-surface-600/20 text-sm text-gray-300 font-mono align-top">{note.note_time}</td>
                <td className="px-2 py-1.5 border-b border-surface-600/20 text-sm text-gray-300 whitespace-pre-wrap align-top">{note.action}</td>
                <td className={`px-2 py-1.5 border-b border-surface-600/20 text-xs ${statusColors.text} align-top`}>{note.status}</td>
                <td className="px-2 py-1.5 border-b border-surface-600/20 align-top">
                  <div className="flex gap-1">
                    {note.screenshots && note.screenshots.map(ss => (
                      <ModalScreenshotThumb key={ss.id} filePath={ss.file_path} />
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ModalScreenshotThumb({ filePath }) {
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
      onClick={() => window.api.image.openViewer(filePath)}
      className="relative group aspect-video rounded-lg overflow-hidden border border-surface-500/60 hover:border-primary-400/60 transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/10 hover:scale-[1.02]"
      title="Click to view full size"
    >
      {src ? (
        <>
          <img src={src} alt="" className={`w-full h-full object-cover transition-all duration-200 group-hover:brightness-75 ${loaded ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setLoaded(true)} onError={() => setSrc(null)} />
          {!loaded && <div className="absolute inset-0 bg-surface-700 animate-pulse" />}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <svg className="w-8 h-8 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
          </div>
        </>
      ) : (
        <div className="w-full h-full bg-surface-700 flex items-center justify-center min-h-[120px]">
          <svg className="w-10 h-10 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
        </div>
      )}
    </button>
  );
}
