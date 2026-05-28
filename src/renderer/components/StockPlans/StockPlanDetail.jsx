import React, { useState, useEffect } from 'react';
import { useStockPlan } from '../../hooks/useStockPlan';
import { useApp } from '../../store/appStore';
import { EXECUTION_STATUSES, EXECUTION_STATUS_COLORS, TIMEFRAMES, TIMEFRAME_COLORS, formatDate } from '../../../shared/constants';

export default function StockPlanDetail({ planId, onBack }) {
  const { updatePlan, deletePlan, updateStatus, importChart } = useStockPlan();
  const { showNotification } = useApp();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editable fields
  const [stockName, setStockName] = useState('');
  const [timeframe, setTimeframe] = useState('Weekly');
  const [analysis, setAnalysis] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [chartPath, setChartPath] = useState(null);
  const [chartSrc, setChartSrc] = useState(null);

  useEffect(() => {
    loadPlan();
  }, [planId]);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const data = await window.api.stockPlan.getById(planId);
      if (data) {
        setPlan(data);
        setStockName(data.stock_name || '');
        setTimeframe(data.timeframe || 'Weekly');
        setAnalysis(data.analysis || '');
        setEntryPrice(data.entry_price != null ? String(data.entry_price) : '');
        setTargetPrice(data.target_price != null ? String(data.target_price) : '');
        setStopLoss(data.stop_loss != null ? String(data.stop_loss) : '');
        setChartPath(data.chart_path);
        if (data.chart_path) {
          const fullPath = await window.api.image.getFullPath(data.chart_path);
          if (fullPath) {
            const dataUrl = await window.api.image.toDataUrl(fullPath);
            if (dataUrl) setChartSrc(dataUrl);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!stockName.trim()) {
      showNotification('Stock name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await updatePlan(planId, {
        stockName: stockName.trim(),
        timeframe,
        analysis: analysis.trim(),
        entryPrice: entryPrice ? parseFloat(entryPrice) : null,
        targetPrice: targetPrice ? parseFloat(targetPrice) : null,
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        chartPath,
      });
      if (updated) {
        setPlan(updated);
        showNotification('Plan saved', 'success');
      }
    } catch (err) {
      showNotification('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status) => {
    const newStatus = plan.execution_status === status ? null : status;
    const updated = await updateStatus(planId, newStatus);
    if (updated) {
      setPlan(updated);
      showNotification(newStatus ? `Marked as ${newStatus}` : 'Status cleared', 'success');
    }
  };

  const handleDelete = async () => {
    await deletePlan(planId);
    showNotification('Plan deleted', 'info');
    onBack();
  };

  const handleChartUpload = async () => {
    const filePaths = await window.api.dialog.openFile();
    if (!filePaths || filePaths.length === 0) return;

    const filePath = filePaths[0];
    const fileName = `${Date.now()}_${filePath.split(/[/\\]/).pop()}`;
    const relativePath = await importChart(filePath, (stockName || plan.stock_name || 'unnamed').toUpperCase(), fileName);
    if (relativePath) {
      setChartPath(relativePath);
      const fullPath = await window.api.image.getFullPath(relativePath);
      if (fullPath) {
        const dataUrl = await window.api.image.toDataUrl(fullPath);
        if (dataUrl) setChartSrc(dataUrl);
      }
      showNotification('Chart uploaded', 'success');
    }
  };

  const handleChartClick = () => {
    if (chartPath) {
      window.api.image.openViewer(chartPath);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Plan not found</p>
        <button onClick={onBack} className="btn-ghost text-sm mt-4">Back to list</button>
      </div>
    );
  }

  const statusColor = plan.execution_status ? EXECUTION_STATUS_COLORS[plan.execution_status] : null;
  const tfColor = TIMEFRAME_COLORS[plan.timeframe];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">Back</span>
        </button>
        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Delete this plan?</span>
              <button onClick={handleDelete} className="btn-primary text-xs px-3 py-1.5 bg-red-600 hover:bg-red-500">Delete Forever</button>
              <button onClick={() => setConfirmDelete(false)} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="btn-ghost text-xs text-red-400 hover:text-red-300">
              <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Chart section */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">Chart Snapshot</h3>
          <button onClick={handleChartUpload} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {chartPath ? 'Replace' : 'Upload'}
          </button>
        </div>
        {chartSrc ? (
          <button onClick={handleChartClick} className="w-full rounded-lg overflow-hidden border border-surface-500/60 hover:border-primary-400/60 transition-colors">
            <img src={chartSrc} alt="Chart" className="w-full max-h-80 object-contain" onError={() => setChartSrc(null)} />
          </button>
        ) : (
          <div className="w-full h-40 border-2 border-dashed border-surface-500 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <svg className="w-10 h-10 text-surface-500 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <line x1="6" y1="4" x2="6" y2="20" strokeLinecap="round" />
                <rect x="4" y="7" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
                <line x1="12" y1="2" x2="12" y2="16" strokeLinecap="round" />
                <rect x="10" y="5" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
                <line x1="18" y1="6" x2="18" y2="22" strokeLinecap="round" />
                <rect x="16" y="10" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
              </svg>
              <p className="text-xs text-gray-500">No chart uploaded</p>
            </div>
          </div>
        )}
      </div>

      {/* Plan details */}
      <div className="glass-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stock Name */}
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase">Stock Name</label>
            <input
              type="text"
              value={stockName}
              onChange={(e) => setStockName(e.target.value)}
              placeholder="e.g. RELIANCE, TCS"
              className="input-field text-sm"
            />
          </div>

          {/* Timeframe */}
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="input-field text-sm"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Analysis */}
        <div>
          <label className="block text-[10px] text-gray-500 mb-1 uppercase">Analysis / Trade Plan</label>
          <textarea
            value={analysis}
            onChange={(e) => setAnalysis(e.target.value)}
            placeholder="Describe your trade thesis, setup, and reasoning..."
            rows={4}
            className="input-field text-sm resize-y"
          />
        </div>

        {/* Price levels */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase">Entry (optional)</label>
            <input
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="Price"
              className="input-field text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase">Target</label>
            <input
              type="number"
              step="any"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="Price"
              className="input-field text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase">Stop Loss</label>
            <input
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="Price"
              className="input-field text-sm"
            />
          </div>
        </div>
      </div>

      {/* Execution Status */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Execution Status</h3>
        <div className="flex gap-2">
          {EXECUTION_STATUSES.map((status) => {
            const colors = EXECUTION_STATUS_COLORS[status];
            const isActive = plan.execution_status === status;
            return (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? `${colors.bg} ${colors.text} border ${colors.border}`
                    : 'bg-surface-700 text-gray-400 border border-surface-600 hover:border-surface-500'
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>
        {plan.execution_status && (
          <button
            onClick={() => handleStatusChange(null)}
            className="text-xs text-gray-500 hover:text-gray-400 mt-2"
          >
            Clear status
          </button>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-6 py-2">
          {saving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Saving...
            </span>
          ) : 'Save Plan'}
        </button>
      </div>

      {/* Meta info */}
      <div className="text-xs text-gray-600 text-right">
        Created: {new Date(plan.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        {plan.updated_at !== plan.created_at && (
          <> &middot; Updated: {new Date(plan.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
        )}
      </div>
    </div>
  );
}
