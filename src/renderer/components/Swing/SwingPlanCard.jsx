import React, { useState, useEffect } from 'react';
import {
  TIMEFRAME_COLORS, STOCK_PLAN_BIAS_COLORS, BEHAVIOR_TAGS, DAY_PLAN_STATUS_COLORS,
  deriveBehaviorTag, formatDate,
} from '../../../shared/constants';
import { useLanguage } from '../../hooks/useLanguage';

export default function SwingPlanCard({ plan, onClick, onDelete }) {
  const { t } = useLanguage();
  const [setupShot, setSetupShot] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load first setup screenshot as the card thumbnail (if any)
  useEffect(() => {
    (async () => {
      const shots = await window.api.swingPlanScreenshot.getBySwingPlan(plan.id, 'setup');
      if (!shots || shots.length === 0) return;
      const fullPath = await window.api.image.getFullPath(shots[0].file_path);
      if (fullPath) {
        const dataUrl = await window.api.image.toDataUrl(fullPath);
        if (dataUrl) setSetupShot(dataUrl);
      }
    })();
  }, [plan.id]);

  const biasColors  = STOCK_PLAN_BIAS_COLORS[plan.bias];
  const tag         = deriveBehaviorTag(plan.bias, plan.behavior_tag);
  const tagColors   = tag && tag !== plan.bias ? BEHAVIOR_TAGS[tag] : null;
  const tfColors    = TIMEFRAME_COLORS[plan.timeframe] || { bg: 'bg-surface-600', text: 'text-gray-400', border: 'border-surface-500' };
  const execColors  = plan.execution_status && plan.execution_status !== 'Waiting'
    ? DAY_PLAN_STATUS_COLORS[plan.execution_status]
    : null;

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete(plan.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <div
      onClick={() => onClick(plan.id)}
      className="glass-card-hover w-full text-left p-4 group cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(plan.id); }}
    >
      <div className="flex items-start gap-4">
        {/* Chart thumbnail */}
        {setupShot && (
          <div className="w-16 h-16 rounded-lg overflow-hidden border border-surface-500/60 flex-shrink-0">
            <img src={setupShot} alt={plan.symbol_name} className="w-full h-full object-cover" onError={() => setSetupShot(null)} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-base font-semibold text-gray-200">{plan.symbol_name}</span>
            <span className="text-xs text-gray-500">·</span>
            <span className="text-sm text-gray-300 truncate">{plan.name}</span>
            <span className={`badge text-[10px] ${tfColors.bg} ${tfColors.text} border ${tfColors.border}`}>
              {plan.timeframe}
            </span>
            {biasColors && (
              <span className={`badge text-[10px] ${biasColors.bg} ${biasColors.text} border ${biasColors.border}`}>
                {plan.bias}
              </span>
            )}
            {tagColors && (
              <span className={`badge text-[10px] ${tagColors.bg} ${tagColors.text} border ${tagColors.border}`}>
                {tag}
              </span>
            )}
            {execColors && (
              <span className={`badge text-[10px] ${execColors.bg} ${execColors.text} border ${execColors.border}`}>
                {plan.execution_status}
              </span>
            )}
          </div>

          {/* Price levels */}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {plan.entry_price != null && (
              <span>{t('entryPrice')}: <span className="text-gray-300">{plan.entry_price}</span></span>
            )}
            {plan.target_price != null && (
              <span>{t('target')}: <span className="text-emerald-400">{plan.target_price}</span></span>
            )}
            {plan.stop_loss != null && (
              <span>{t('stopLoss')}: <span className="text-red-400">{plan.stop_loss}</span></span>
            )}
          </div>

          {/* Analysis preview + plan date */}
          {plan.analysis && (
            <p className="text-xs text-gray-500 mt-1 truncate">{plan.analysis}</p>
          )}
          {plan.plan_date && (
            <p className="text-[10px] text-gray-600 mt-1">{formatDate(plan.plan_date)}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {confirmDelete ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs text-gray-400">{t('delete')}?</span>
              <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10">{t('yes')}</button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }} className="text-xs text-gray-400 hover:text-gray-300 px-2 py-1 rounded bg-surface-600">{t('no')}</button>
            </div>
          ) : (
            <button onClick={handleDelete} className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
