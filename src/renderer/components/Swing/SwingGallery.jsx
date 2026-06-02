import React, { useState, useEffect, useCallback } from 'react';
import { useSwingPlan } from '../../hooks/useSwingPlan';
import { useLanguage } from '../../hooks/useLanguage';
import { TIMEFRAMES, DAY_PLAN_STATUSES } from '../../../shared/constants';
import SwingPlanCard from './SwingPlanCard';
import SwingPlanDetail from './SwingPlanDetail';
import SwingPlanOverviewModal from './SwingPlanOverviewModal';
import BiasMultiSelect from '../shared/BiasMultiSelect';

// Full history of swing plans — read-only entry, but the detail page itself is editable
// (matches Intraday's Gallery behaviour where clicking a day still lets you edit per-plan fields).
export default function SwingGallery() {
  const { search, deletePlan } = useSwingPlan();
  const { t } = useLanguage();

  const [plans, setPlans]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [searchQuery, setSearchQuery]     = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState('');
  const [biasSet, setBiasSet]             = useState(() => new Set());
  const [symbolFilter, setSymbolFilter]   = useState('');
  const [availableSymbols, setAvailableSymbols] = useState([]);
  const [overviewIndex, setOverviewIndex]       = useState(null);
  const [selectedPlanId, setSelectedPlanId]     = useState(null);

  useEffect(() => {
    window.api.swingPlan.getDistinctSymbols().then((rows) => setAvailableSymbols(rows || []));
  }, []);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    const results = await search({
      query: searchQuery,
      executionStatus: statusFilter || undefined,
      timeframe: timeframeFilter || undefined,
      biases: biasSet.size > 0 ? [...biasSet] : undefined,
      symbolId: symbolFilter ? Number(symbolFilter) : undefined,
    });
    setPlans(results || []);
    setLoading(false);
  }, [searchQuery, statusFilter, timeframeFilter, biasSet, symbolFilter, search]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  if (selectedPlanId) {
    return (
      <SwingPlanDetail
        planId={selectedPlanId}
        onBack={() => { setSelectedPlanId(null); loadPlans(); }}
      />
    );
  }

  const handleDelete = async (id) => {
    try {
      await deletePlan(id);
      loadPlans();
    } catch (_) {}
  };

  return (
    <div className="space-y-4">
      {overviewIndex !== null && (
        <SwingPlanOverviewModal
          plans={plans}
          initialIndex={overviewIndex}
          onClose={() => setOverviewIndex(null)}
          onEdit={(id) => { setSelectedPlanId(id); setOverviewIndex(null); }}
        />
      )}
      {/* Search + filter bar */}
      <div className="glass-card p-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by stock or plan name…"
              className="input-field text-sm pl-9 w-full"
            />
          </div>

          <select
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">All Symbols</option>
            {availableSymbols.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">{t('allStatus')}</option>
            {DAY_PLAN_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={timeframeFilter}
            onChange={(e) => setTimeframeFilter(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">{t('allTimeframes')}</option>
            {TIMEFRAMES.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </div>

        <div className="mt-3 max-w-xs">
          <BiasMultiSelect selected={biasSet} onChange={setBiasSet} />
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
            <SwingPlanCard
              key={plan.id}
              plan={plan}
              onClick={(id) => setOverviewIndex(plans.findIndex((p) => p.id === id))}
              onDelete={handleDelete}
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
