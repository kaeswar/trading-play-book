import React, { useState } from 'react';
import { useApp } from '../../store/appStore';
import { useLanguage } from '../../hooks/useLanguage';

export default function QueryPanel({ filters, onFilterChange }) {
  const { symbols } = useApp();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const updateFilter = (key, value) => {
    const newFilters = { ...filters };
    if (value === '' || value === null || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="glass-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-medium text-gray-300">{t('filters')}</span>
          {activeFilterCount > 0 && (
            <span className="badge bg-primary-500/20 text-primary-400 text-xs">{activeFilterCount}</span>
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
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-surface-600/50 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase">{t('filterDateFrom')}</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase">{t('filterDateTo')}</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="input-field text-sm"
              />
            </div>

            {/* Plan execution status */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase">{t('filterOutcome')}</label>
              <select
                value={filters.outcome || ''}
                onChange={(e) => updateFilter('outcome', e.target.value)}
                className="input-field text-sm"
              >
                <option value="">{t('filterAll')}</option>
                <option value="Successful">Successful</option>
                <option value="Failed">Failed</option>
                <option value="Cost-to-Cost">Cost-to-Cost</option>
                <option value="Cancelled">{t('cancelled')}</option>
                <option value="Waiting">{t('waiting')}</option>
              </select>
            </div>

            {/* Bias */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase">{t('filterBias')}</label>
              <select
                value={filters.bias || ''}
                onChange={(e) => updateFilter('bias', e.target.value)}
                className="input-field text-sm"
              >
                <option value="">{t('filterAll')}</option>
                <option value="Super Bullish">{t('superBullish')}</option>
                <option value="Bullish">{t('bullish')}</option>
                <option value="Range Bound">{t('rangeBound')}</option>
                <option value="Bearish">{t('bearish')}</option>
                <option value="Super Bearish">{t('superBearish')}</option>
              </select>
            </div>

          </div>

          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="btn-ghost text-xs mt-3">
              {t('clearFilters')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
