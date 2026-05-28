import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useCustomPlan } from '../../hooks/useCustomPlan';
import { useApp } from '../../store/appStore';
import CustomPlanCard from './CustomPlanCard';

const CustomPlansSection = forwardRef(function CustomPlansSection({ tradingDay, onRefresh }, ref) {
  const { getCustomPlans, saveCustomPlan, deleteCustomPlan } = useCustomPlan();
  const { showNotification } = useApp();
  const [customPlans, setCustomPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const cardRefs = useRef({});

  const loadCustomPlans = useCallback(async () => {
    if (!tradingDay?.id) return;
    setLoading(true);
    try {
      const plans = await getCustomPlans(tradingDay.id);
      setCustomPlans(plans);
    } catch (err) {
      console.error('Failed to load custom plans:', err);
    } finally {
      setLoading(false);
    }
  }, [tradingDay?.id]);

  useEffect(() => {
    loadCustomPlans();
  }, [loadCustomPlans]);

  const handleAddPlan = async () => {
    try {
      const newPlan = await saveCustomPlan({
        tradingDayId: tradingDay.id,
        title: '',
        tradePlan: '',
        biasTag: null,
        target: null,
        stopOut: null,
      });
      if (newPlan) {
        await loadCustomPlans();
        showNotification('Custom plan added', 'success');
      }
    } catch (err) {
      showNotification('Failed to add custom plan', 'error');
    }
  };

  const handleDelete = async (planId) => {
    try {
      await deleteCustomPlan(planId);
      await loadCustomPlans();
      showNotification('Custom plan deleted', 'info');
    } catch (err) {
      showNotification('Failed to delete custom plan', 'error');
    }
  };

  const handleCardRefresh = async () => {
    await loadCustomPlans();
    if (onRefresh) onRefresh();
  };

  // Expose saveAll() for bulk save from parent PlanningView
  useImperativeHandle(ref, () => ({
    saveAll: async () => {
      const refs = Object.values(cardRefs.current);
      for (const cardRef of refs) {
        if (cardRef?.save) await cardRef.save();
      }
    },
  }));

  return (
    <div className="pt-4 border-t border-surface-600/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500"></div>
          <h3 className="section-title text-purple-400">Custom Plans</h3>
          {customPlans.length > 0 && (
            <span className="text-[10px] text-gray-500 ml-1">({customPlans.length})</span>
          )}
        </div>
        <button
          onClick={handleAddPlan}
          className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Plan
        </button>
      </div>

      {loading && customPlans.length === 0 && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
        </div>
      )}

      {customPlans.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {customPlans.map((plan) => (
            <CustomPlanCard
              key={plan.id}
              ref={(el) => { cardRefs.current[plan.id] = el; }}
              customPlan={plan}
              tradingDay={tradingDay}
              onRefresh={handleCardRefresh}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {!loading && customPlans.length === 0 && (
        <p className="text-xs text-gray-600 text-center py-3">No custom plans yet. Click "+ Add Plan" to create one.</p>
      )}
    </div>
  );
});

export default CustomPlansSection;
