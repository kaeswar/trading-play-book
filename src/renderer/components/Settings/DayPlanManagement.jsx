import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../store/appStore';
import { formatDate } from '../../../shared/constants';
import StyledDatePicker from '../shared/StyledDatePicker';

export default function DayPlanManagement() {
  const { symbols, showNotification, refreshDatesFn } = useApp();

  const [sourceSymbolId, setSourceSymbolId] = useState('');
  const [sourceDates, setSourceDates] = useState([]);
  const [sourceDate, setSourceDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [moving, setMoving] = useState(false);
  const [moveStatus, setMoveStatus] = useState(null);

  useEffect(() => {
    if (symbols.length > 0 && !sourceSymbolId) {
      setSourceSymbolId(String(symbols[0].id));
    }
  }, [symbols]);

  useEffect(() => {
    setSourceDate('');
    setTargetDate('');
    setMoveStatus(null);
    if (!sourceSymbolId) { setSourceDates([]); return; }
    window.api.tradingDay.getAvailableDates(Number(sourceSymbolId)).then((dates) => {
      setSourceDates(dates);
      if (dates.length > 0) setSourceDate(dates[0]);
    });
  }, [sourceSymbolId]);

  const handleMovePlan = useCallback(async () => {
    if (!sourceSymbolId || !sourceDate || !targetDate) return;
    if (sourceDate === targetDate) {
      setMoveStatus({ type: 'error', message: 'Target date must be different from the source date.' });
      return;
    }
    setMoving(true);
    setMoveStatus(null);
    try {
      const day = await window.api.tradingDay.getByDateAndSymbol(sourceDate, Number(sourceSymbolId));
      if (!day) {
        setMoveStatus({ type: 'error', message: 'No plan found for the selected source date.' });
        return;
      }
      await window.api.tradingDay.updateDate(day.id, targetDate);
      const symbolName = symbols.find((s) => s.id === Number(sourceSymbolId))?.name || '';
      setMoveStatus({
        type: 'success',
        message: `Plan for ${symbolName} moved from ${formatDate(sourceDate)} to ${formatDate(targetDate)}.`,
      });
      const updatedDates = await window.api.tradingDay.getAvailableDates(Number(sourceSymbolId));
      setSourceDates(updatedDates);
      setSourceDate(targetDate);
      setTargetDate('');
      if (refreshDatesFn) refreshDatesFn();
      showNotification('Plan date updated successfully', 'success');
    } catch (err) {
      setMoveStatus({ type: 'error', message: err.message || 'Failed to move plan.' });
    } finally {
      setMoving(false);
    }
  }, [sourceSymbolId, sourceDate, targetDate, symbols, refreshDatesFn]);

  const canMove = sourceSymbolId && sourceDate && targetDate && sourceDate !== targetDate && !moving;

  return (
    <div className="space-y-4 max-w-lg">
      {/* Move Plan card */}
      <div className="glass-card p-5 space-y-5">
        <div>
          <h4 className="text-sm font-semibold text-gray-200 mb-1">Move Plan to Another Date</h4>
          <p className="text-xs text-gray-500">
            Reassign a trading day plan to a different date. All associated possibilities, outcome plans,
            screenshots, verdicts, and notes move together.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Symbol</label>
              <select
                value={sourceSymbolId}
                onChange={(e) => setSourceSymbolId(e.target.value)}
                className="input-field text-sm w-full"
              >
                {symbols.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Source Date</label>
              {sourceDates.length === 0 ? (
                <div className="input-field text-sm text-gray-600">No plans found</div>
              ) : (
                <select
                  value={sourceDate}
                  onChange={(e) => { setSourceDate(e.target.value); setTargetDate(''); setMoveStatus(null); }}
                  className="input-field text-sm w-full"
                >
                  {sourceDates.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-600/50"></div>
            <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <div className="flex-1 h-px bg-surface-600/50"></div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Move To Date</label>
            <StyledDatePicker
              value={targetDate}
              onChange={(d) => { setTargetDate(d); setMoveStatus(null); }}
              placeholderText="Pick a new date"
            />
          </div>
        </div>

        {moveStatus && (
          <div className={`flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm border ${
            moveStatus.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {moveStatus.type === 'success' ? (
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {moveStatus.message}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-gray-600">This change cannot be undone automatically.</p>
          <button
            onClick={handleMovePlan}
            disabled={!canMove}
            className={`btn-primary text-sm px-5 py-2 font-medium flex items-center gap-2 ${!canMove ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {moving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Moving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Move Plan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
