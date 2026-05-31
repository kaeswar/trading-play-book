import React, { useState, useEffect } from 'react';
import { EXECUTION_STATUS_COLORS, TIMEFRAME_COLORS, STOCK_PLAN_BIAS_COLORS } from '../../../shared/constants';

export default function StockPlanCard({ plan, onClick, onDelete }) {
  const [chartSrc, setChartSrc] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (plan.chart_path) {
      window.api.image.getFullPath(plan.chart_path).then(async (fullPath) => {
        if (fullPath) {
          const dataUrl = await window.api.image.toDataUrl(fullPath);
          if (dataUrl) setChartSrc(dataUrl);
        }
      });
    }
  }, [plan.chart_path]);

  const statusColor = plan.execution_status ? EXECUTION_STATUS_COLORS[plan.execution_status] : null;
  const tfColor = TIMEFRAME_COLORS[plan.timeframe];
  const biasColor = plan.bias_tag ? STOCK_PLAN_BIAS_COLORS[plan.bias_tag] : null;

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
        {chartSrc && (
          <div className="w-16 h-16 rounded-lg overflow-hidden border border-surface-500/60 flex-shrink-0">
            <img src={chartSrc} alt={plan.stock_name} className="w-full h-full object-cover" onError={() => setChartSrc(null)} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-200">{plan.stock_name}</h3>
            <span className={`badge text-[10px] ${tfColor.bg} ${tfColor.text} border ${tfColor.border}`}>
              {plan.timeframe}
            </span>
            {biasColor && (
              <span className={`badge text-[10px] ${biasColor.bg} ${biasColor.text} border ${biasColor.border}`}>
                {plan.bias_tag}
              </span>
            )}
            {statusColor && (
              <span className={`badge text-[10px] ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
                {plan.execution_status}
              </span>
            )}
          </div>

          {/* Price levels */}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {plan.entry_price && (
              <span>Entry: <span className="text-gray-300">{plan.entry_price}</span></span>
            )}
            {plan.target_price && (
              <span>Target: <span className="text-emerald-400">{plan.target_price}</span></span>
            )}
            {plan.stop_loss && (
              <span>SL: <span className="text-red-400">{plan.stop_loss}</span></span>
            )}
          </div>

          {/* Analysis preview */}
          {plan.analysis && (
            <p className="text-xs text-gray-500 mt-1 truncate">{plan.analysis}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {confirmDelete ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs text-gray-400">Delete?</span>
              <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10">Yes</button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }} className="text-xs text-gray-400 hover:text-gray-300 px-2 py-1 rounded bg-surface-600">No</button>
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
