import React, { useState, useEffect, useCallback } from 'react';
import { useStockPlan } from '../../hooks/useStockPlan';
import { useApp } from '../../store/appStore';
import { EXECUTION_STATUSES, TIMEFRAMES } from '../../../shared/constants';
import StockPlanCard from './StockPlanCard';
import StockPlanDetail from './StockPlanDetail';
import StockPlanForm from './StockPlanForm';

export default function StockPlansView() {
  const { searchPlans, deletePlan } = useStockPlan();
  const { showNotification } = useApp();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    const results = await searchPlans({
      query: searchQuery,
      executionStatus: statusFilter || undefined,
      timeframe: timeframeFilter || undefined,
    });
    setPlans(results || []);
    setLoading(false);
  }, [searchQuery, statusFilter, timeframeFilter]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleDelete = async (id) => {
    await deletePlan(id);
    showNotification('Plan deleted', 'info');
    loadPlans();
  };

  const handlePlanCreated = (planId) => {
    setShowForm(false);
    setSelectedPlanId(planId);
    loadPlans();
  };

  // Show detail view
  if (selectedPlanId) {
    return (
      <StockPlanDetail
        planId={selectedPlanId}
        onBack={() => { setSelectedPlanId(null); loadPlans(); }}
      />
    );
  }

  // Show create form
  if (showForm) {
    return (
      <StockPlanForm
        onCreated={handlePlanCreated}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="glass-card p-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by stock name..."
              className="input-field text-sm pl-9 w-full"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field text-sm w-auto"
          >
            <option value="">All Status</option>
            {EXECUTION_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Timeframe filter */}
          <select
            value={timeframeFilter}
            onChange={(e) => setTimeframeFilter(e.target.value)}
            className="input-field text-sm w-auto"
          >
            <option value="">All Timeframes</option>
            {TIMEFRAMES.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>

          {/* New Plan button */}
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Plan
          </button>
        </div>
      </div>

      {/* Results */}
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
          <p className="text-gray-400 mb-1">No stock plans found</p>
          <p className="text-sm text-gray-500">Create your first swing trade plan to get started</p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm px-5 py-2 mt-4">
            Create Plan
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <StockPlanCard
              key={plan.id}
              plan={plan}
              onClick={setSelectedPlanId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {!loading && plans.length > 0 && (
        <p className="text-xs text-gray-500 text-right">{plans.length} plan{plans.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
