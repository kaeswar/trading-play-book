import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../store/appStore';
import { useLanguage } from '../../hooks/useLanguage';
import { formatDate, OUTCOME_COLORS, BIAS_COLORS, formatPossibilityCode, getBehaviorTag, BEHAVIOR_TAGS, getOutcomeColors, CUSTOM_VERDICT_COLORS } from '../../../shared/constants';
import DayDetailView from './DayDetailView';
import QueryPanel from './QueryPanel';
import MetricsSummary from './MetricsSummary';

export default function GalleryView() {
  const { selectedSymbol, galleryFilters, setGalleryFilters } = useApp();
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [activeTab, setActiveTab] = useState('gallery'); // gallery | metrics
  const filters = galleryFilters;
  const setFilters = setGalleryFilters;

  const loadDays = useCallback(async () => {
    setLoading(true);
    try {
      const queryFilters = { ...filters };
      if (selectedSymbol) queryFilters.symbolId = selectedSymbol.id;
      const result = await window.api.query.getFilteredDays(queryFilters);
      setDays(result);
    } catch (err) {
      console.error('Failed to load days:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol, filters]);

  useEffect(() => {
    loadDays();
  }, [loadDays]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  if (selectedDayId) {
    return (
      <DayDetailView
        tradingDayId={selectedDayId}
        dayIds={days.map(d => d.id)}
        onBack={() => setSelectedDayId(null)}
        onNavigate={(id) => setSelectedDayId(id)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <GalleryTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === 'gallery' ? (
        <>
          {/* Filters */}
          <QueryPanel filters={filters} onFilterChange={handleFilterChange} />

          {/* Day List */}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : days.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-gray-500">No trading days found</p>
              <p className="text-xs text-gray-600 mt-1">Start by creating a trading plan in the Planning view</p>
            </div>
          ) : (
            <div className="space-y-3">
              {days.map((day) => (
                <DayCard
                  key={day.id}
                  day={day}
                  onClick={() => setSelectedDayId(day.id)}
                  onDelete={loadDays}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <MetricsSummary symbolId={selectedSymbol?.id} />
      )}
    </div>
  );
}

function GalleryTabs({ activeTab, setActiveTab }) {
  const { t } = useLanguage();
  return (
    <div className="flex gap-1 p-1 bg-surface-800 rounded-lg w-fit">
      <button
        onClick={() => setActiveTab('gallery')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeTab === 'gallery'
            ? 'bg-primary-600 text-white'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        {t('gallery')}
      </button>
      <button
        onClick={() => setActiveTab('metrics')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeTab === 'metrics'
            ? 'bg-primary-600 text-white'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        {t('metrics')}
      </button>
    </div>
  );
}

function DayCard({ day, onClick, onDelete }) {
  const { t } = useLanguage();
  const hasVerdict = !!day.verdict_code;
  const isUnprepared = hasVerdict && !day.verdict_had_plan;
  const behaviorTag = hasVerdict ? getBehaviorTag(day.verdict_code, day.verdict_outcome) : null;
  const behaviorColors = behaviorTag ? BEHAVIOR_TAGS[behaviorTag] : null;
  const customPlanVerdicts = day.custom_plan_verdicts ? day.custom_plan_verdicts.split('||').filter(Boolean) : [];
  const hasCustomVerdicts = customPlanVerdicts.length > 0;
  const screenshotPaths = day.screenshot_paths ? day.screenshot_paths.split('||').filter(Boolean) : [];
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await window.api.tradingDay.delete(day.id);
      onDelete();
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {/* Date */}
            <div className="text-center min-w-[60px]">
              <p className="text-lg font-bold text-gray-100">
                {new Date(day.trade_date + 'T00:00:00').getDate()}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(day.trade_date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}
              </p>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="badge bg-surface-600 text-gray-300 text-xs">{day.symbol_name}</span>
                <span className="text-sm text-gray-400">{formatDate(day.trade_date)}</span>
              </div>

              {hasVerdict ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">{t('tabVerdict')}:</span>
                  <span className="text-sm font-medium text-gray-200">
                    {formatPossibilityCode(day.verdict_code)}
                  </span>
                  <span className={`badge text-xs ${getOutcomeColors(day.verdict_outcome, day.verdict_bias)?.bg} ${getOutcomeColors(day.verdict_outcome, day.verdict_bias)?.text} border ${getOutcomeColors(day.verdict_outcome, day.verdict_bias)?.border}`}>
                    {day.verdict_outcome}
                  </span>
                  {behaviorColors && (
                    <span className={`badge text-xs ${behaviorColors.bg} ${behaviorColors.text} border ${behaviorColors.border}`}>
                      {behaviorTag}
                    </span>
                  )}
                </div>
              ) : hasCustomVerdicts ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 font-medium">{t('tabVerdict')}:</span>
                  {customPlanVerdicts.map((status, i) => {
                    const c = CUSTOM_VERDICT_COLORS[status];
                    return c ? (
                      <span key={i} className={`badge text-xs ${c.bg} ${c.text} border ${c.border}`}>
                        {status}
                      </span>
                    ) : null;
                  })}
                </div>
              ) : (
                <span className="badge text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {t('verdictPending')}
                </span>
              )}

              {/* Screenshot thumbnails */}
              {screenshotPaths.length > 0 && (
                <div className="flex gap-1.5 mt-2">
                  {screenshotPaths.slice(0, 5).map((filePath, idx) => (
                    <GalleryScreenshotThumb key={idx} filePath={filePath} />
                  ))}
                  {screenshotPaths.length > 5 && (
                    <span className="text-[10px] text-gray-500 self-center ml-1">+{screenshotPaths.length - 5}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isUnprepared && (
              <span className="badge text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {t('unprepared')}
              </span>
            )}
            {screenshotPaths.length > 0 && (
              <span className="badge text-xs bg-surface-600 text-gray-400">
                {screenshotPaths.length} img
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 pb-3 justify-end border-t border-surface-600/40 pt-2">
        <button
          onClick={onClick}
          className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors px-2 py-1 rounded hover:bg-primary-500/10"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {t('view')}
        </button>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('remove')}
          </button>
        ) : (
          <div className="flex items-center gap-1.5 bg-surface-700 border border-surface-500 rounded-lg px-2 py-1">
            <span className="text-[11px] text-gray-300 whitespace-nowrap">{t('remove')}?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-[11px] px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
            >
              {deleting ? '...' : 'Yes'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[11px] px-2 py-0.5 bg-surface-600 hover:bg-surface-500 text-gray-300 rounded transition-colors"
            >
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GalleryScreenshotThumb({ filePath }) {
  const [src, setSrc] = React.useState(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    window.api.image.getFullPath(filePath).then(async (fullPath) => {
      if (fullPath) {
        const dataUrl = await window.api.image.toDataUrl(fullPath);
        if (dataUrl) setSrc(dataUrl);
      }
    });
  }, [filePath]);

  const handleClick = (e) => {
    e.stopPropagation();
    window.api.image.openViewer(filePath);
  };

  return (
    <div
      onClick={handleClick}
      className="relative group w-10 h-10 rounded-lg overflow-hidden border border-surface-500/60 hover:border-primary-400/60 transition-all duration-200 hover:shadow-md hover:shadow-primary-500/10 hover:scale-105 flex-shrink-0 cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(e); }}
    >
      {src ? (
        <>
          <img
            src={src}
            alt=""
            className={`w-full h-full object-cover transition-all duration-200 group-hover:brightness-75 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setSrc(null)}
          />
          {!loaded && (
            <div className="absolute inset-0 bg-surface-700 animate-pulse" />
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <svg className="w-4 h-4 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </>
      ) : (
        <div className="w-full h-full bg-surface-700 flex items-center justify-center">
          <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {/* Candlestick chart icon */}
            <line x1="6" y1="4" x2="6" y2="20" strokeLinecap="round" />
            <rect x="4" y="7" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
            <line x1="12" y1="2" x2="12" y2="16" strokeLinecap="round" />
            <rect x="10" y="5" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
            <line x1="18" y1="6" x2="18" y2="22" strokeLinecap="round" />
            <rect x="16" y="10" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
          </svg>
        </div>
      )}
    </div>
  );
}
