import React, { useState, useEffect, useCallback } from 'react';
import { useSwingPlan } from '../../hooks/useSwingPlan';
import { useApp } from '../../store/appStore';
import { useLanguage } from '../../hooks/useLanguage';
import { TIMEFRAMES } from '../../../shared/constants';
import SwingPlanCard from './SwingPlanCard';
import SwingPlanDetail from './SwingPlanDetail';
import SwingPlanInstanceForm from './SwingPlanInstanceForm';
import PlanStorePicker from '../Phase1/PlanStorePicker';

export default function SwingPlansView() {
  const { search, deletePlan } = useSwingPlan();
  const { showNotification } = useApp();
  const { t } = useLanguage();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  // New-plan flow: pick template → fill instance form
  const [pickerOpen, setPickerOpen]       = useState(false);
  const [pickedTemplate, setPickedTemplate] = useState(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    const results = await search({
      query: searchQuery,
      timeframe: timeframeFilter || undefined,
      activeOnly: true,
    });
    setPlans(results || []);
    setLoading(false);
  }, [searchQuery, timeframeFilter, search]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const handleDelete = async (id) => {
    try {
      await deletePlan(id);
      showNotification('Plan deleted', 'info');
      loadPlans();
    } catch (err) {
      showNotification('Failed to delete', 'error');
    }
  };

  // Picker confirmed → fetch the picked template + open the instance form
  const handlePickerConfirm = async (templateIds) => {
    if (!templateIds || templateIds.length === 0) return;
    const tpl = await window.api.planTemplate.get(templateIds[0]);
    setPickerOpen(false);
    setPickedTemplate(tpl);
  };

  const handleFormSaved = (swingPlan) => {
    setPickedTemplate(null);
    loadPlans();
    if (swingPlan?.id) setSelectedPlanId(swingPlan.id);
  };

  // ── Detail view ──
  if (selectedPlanId) {
    return (
      <SwingPlanDetail
        planId={selectedPlanId}
        onBack={() => { setSelectedPlanId(null); loadPlans(); }}
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
            value={timeframeFilter}
            onChange={(e) => setTimeframeFilter(e.target.value)}
            className="input-field text-sm w-auto"
          >
            <option value="">{t('allTimeframes')}</option>
            {TIMEFRAMES.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>

          <button
            onClick={() => setPickerOpen(true)}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('newSwingPlan') || 'New Swing Plan'}
          </button>
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
          <p className="text-gray-400 mb-1">No active swing plans</p>
          <p className="text-sm text-gray-500">Pick a Swing template from the Plan Store to get started.</p>
          <button onClick={() => setPickerOpen(true)} className="btn-primary text-sm px-5 py-2 mt-4">
            {t('newSwingPlan') || 'New Swing Plan'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <SwingPlanCard
              key={plan.id}
              plan={plan}
              onClick={setSelectedPlanId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {!loading && plans.length > 0 && (
        <p className="text-xs text-gray-500 text-right">{plans.length} active plan{plans.length !== 1 ? 's' : ''}</p>
      )}

      {/* Template picker — single-pick, Swing tradeType */}
      {pickerOpen && (
        <PlanStorePicker
          tradeType="Swing"
          singlePick
          confirmLabel="Next →"
          onConfirm={handlePickerConfirm}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Instance form — symbol/timeframe/entry/target/stop/analysis */}
      {pickedTemplate && (
        <SwingPlanInstanceForm
          template={pickedTemplate}
          onSaved={handleFormSaved}
          onClose={() => setPickedTemplate(null)}
        />
      )}
    </div>
  );
}
