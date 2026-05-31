import React, { useState, useEffect, useCallback } from 'react';
import { useStockPlan } from '../../hooks/useStockPlan';
import { useLanguage } from '../../hooks/useLanguage';
import { EXECUTION_STATUSES, TIMEFRAMES, STOCK_PLAN_BIAS_TAGS } from '../../../shared/constants';
import { BIAS_KEY_MAP } from '../../../shared/i18n';
import StockPlanCard from './StockPlanCard';
import StockPlanDetail from './StockPlanDetail';

export default function StockPlanGallery() {
  const { searchPlans, deletePlan } = useStockPlan();
  const { t } = useLanguage();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState('');
  const [biasFilter, setBiasFilter] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    const results = await searchPlans({
      query: searchQuery,
      executionStatus: statusFilter || undefined,
      timeframe: timeframeFilter || undefined,
      biasTag: biasFilter || undefined,
    });
    setPlans(results || []);
    setLoading(false);
  }, [searchQuery, statusFilter, timeframeFilter, biasFilter]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  if (selectedPlanId) {
    return (
      <StockPlanDetail
        planId={selectedPlanId}
        onBack={() => setSelectedPlanId(null)}
        readOnly
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="glass-card p-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchByStock')}
              className="input-field text-sm pl-9 w-full"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field text-sm w-auto"
          >
            <option value="">{t('allStatus')}</option>
            {EXECUTION_STATUSES.map((s) => (
              <option key={s} value={s}>{t(s.toLowerCase())}</option>
            ))}
          </select>

          <select
            value={timeframeFilter}
            onChange={(e) => setTimeframeFilter(e.target.value)}
            className="input-field text-sm w-auto"
          >
            <option value="">{t('allTimeframes')}</option>
            {TIMEFRAMES.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>

          <select
            value={biasFilter}
            onChange={(e) => setBiasFilter(e.target.value)}
            className="input-field text-sm w-auto"
          >
            <option value="">{t('allBiases')}</option>
            {STOCK_PLAN_BIAS_TAGS.map((b) => (
              <option key={b} value={b}>{t(BIAS_KEY_MAP[b])}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <svg className="w-14 h-14 text-surface-500 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="6" y1="4" x2="6" y2="20" strokeLinecap="round" />
            <rect x="4" y="7" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
            <line x1="12" y1="2" x2="12" y2="16" strokeLinecap="round" />
            <rect x="10" y="5" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
            <line x1="18" y1="6" x2="18" y2="22" strokeLinecap="round" />
            <rect x="16" y="10" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
          </svg>
          <p className="text-gray-400 mb-1">No plans found</p>
          <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <StockPlanCard
              key={plan.id}
              plan={plan}
              onClick={setSelectedPlanId}
              onDelete={async (id) => { await deletePlan(id); loadPlans(); }}
            />
          ))}
        </div>
      )}

      {!loading && plans.length > 0 && (
        <p className="text-xs text-gray-500 text-right">{plans.length} plan{plans.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
