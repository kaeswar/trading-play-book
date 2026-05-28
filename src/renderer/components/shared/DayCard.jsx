import React from 'react';
import { formatDate, formatPossibilityCode, BIAS_COLORS, OUTCOME_COLORS } from '../../../shared/constants';

export default function DayCard({ day, onClick }) {
  const hasVerdict = !!day.verdict_code;
  const isUnprepared = hasVerdict && !day.verdict_had_plan;

  return (
    <button
      onClick={onClick}
      className="glass-card-hover w-full p-4 text-left group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-surface-700 flex flex-col items-center justify-center border border-surface-500 group-hover:border-primary-500/30 transition-colors">
            <span className="text-lg font-bold text-gray-100">
              {new Date(day.trade_date + 'T00:00:00').getDate()}
            </span>
            <span className="text-[10px] text-gray-500 uppercase">
              {new Date(day.trade_date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge bg-surface-600 text-gray-300 text-xs">{day.symbol_name}</span>
              <span className="text-sm text-gray-400">{formatDate(day.trade_date)}</span>
            </div>

            {hasVerdict ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge text-xs ${BIAS_COLORS[day.verdict_bias]?.bg} ${BIAS_COLORS[day.verdict_bias]?.text} border ${BIAS_COLORS[day.verdict_bias]?.border}`}>
                  {day.verdict_bias}
                </span>
                <span className="text-sm font-medium text-gray-200">
                  {formatPossibilityCode(day.verdict_code)}
                </span>
                <span className={`badge text-xs ${OUTCOME_COLORS[day.verdict_outcome]?.bg} ${OUTCOME_COLORS[day.verdict_outcome]?.text} border ${OUTCOME_COLORS[day.verdict_outcome]?.border}`}>
                  {day.verdict_outcome}
                </span>
              </div>
            ) : (
              <span className="badge text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Verdict Pending
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isUnprepared && (
            <span className="badge text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Unprepared
            </span>
          )}
          <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}
