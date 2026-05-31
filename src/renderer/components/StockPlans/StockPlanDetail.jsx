import React, { useState, useEffect } from 'react';
import { useStockPlan } from '../../hooks/useStockPlan';
import { useApp } from '../../store/appStore';
import { useLanguage } from '../../hooks/useLanguage';
import { EXECUTION_STATUSES, EXECUTION_STATUS_COLORS, TIMEFRAMES, TIMEFRAME_COLORS, STOCK_PLAN_BIAS_TAGS, STOCK_PLAN_BIAS_COLORS, formatDate } from '../../../shared/constants';
import { BIAS_KEY_MAP } from '../../../shared/i18n';

export default function StockPlanDetail({ planId, onBack, readOnly = false }) {
  const { updatePlan, deletePlan, updateStatus, importChart } = useStockPlan();
  const { showNotification, symbols } = useApp();
  const { t } = useLanguage();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editable fields
  const [symbolId, setSymbolId] = useState('');
  const [stockName, setStockName] = useState('');
  const [timeframe, setTimeframe] = useState('Weekly');
  const [biasTag, setBiasTag] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [planDate, setPlanDate] = useState('');
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
        setSymbolId(data.symbol_id ? String(data.symbol_id) : '');
        setStockName(data.stock_name || '');
        setTimeframe(data.timeframe || 'Weekly');
        setBiasTag(data.bias_tag || '');
        setAnalysis(data.analysis || '');
        setEntryPrice(data.entry_price != null ? String(data.entry_price) : '');
        setTargetPrice(data.target_price != null ? String(data.target_price) : '');
        setStopLoss(data.stop_loss != null ? String(data.stop_loss) : '');
        setPlanDate(data.plan_date || data.created_at?.slice(0, 10) || '');
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
    const selectedSymbol = symbols.find((s) => s.id === Number(symbolId));
    if (!selectedSymbol) {
      showNotification('Please select a symbol', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await updatePlan(planId, {
        symbolId: selectedSymbol.id,
        stockName: selectedSymbol.name,
        timeframe,
        biasTag: biasTag || null,
        analysis: analysis.trim(),
        entryPrice: entryPrice ? parseFloat(entryPrice) : null,
        targetPrice: targetPrice ? parseFloat(targetPrice) : null,
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        chartPath,
        planDate: planDate || null,
      });
      if (updated) {
        showNotification('Plan updated', 'success');
        onBack();
      }
    } catch (err) {
      showNotification('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status) => {
    if (plan.execution_status === status) return;
    const updated = await updateStatus(planId, status);
    if (updated) setPlan(updated);
  };

  const handleDelete = async () => {
    await deletePlan(planId);
    showNotification('Plan deleted', 'info');
    onBack();
  };

  const handlePaste = async (e) => {
    if (readOnly) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const ext = item.type.split('/')[1] === 'jpeg' ? 'jpg' : item.type.split('/')[1];
        const fileName = `paste_${Date.now()}.${ext}`;
        const symName = symbols.find((s) => s.id === Number(symbolId))?.name || plan.stock_name || 'stock';
        try {
          const relativePath = await window.api.image.saveBuffer(uint8Array, symName, 'stock-plans', fileName);
          if (relativePath) {
            setChartPath(relativePath);
            const fullPath = await window.api.image.getFullPath(relativePath);
            if (fullPath) {
              const dataUrl = await window.api.image.toDataUrl(fullPath);
              if (dataUrl) setChartSrc(dataUrl);
            }
            showNotification('Chart pasted', 'success');
          }
        } catch {
          showNotification('Failed to paste chart', 'error');
        }
        return;
      }
    }
  };

  const handleChartUpload = async () => {
    const filePaths = await window.api.dialog.openFile();
    if (!filePaths || filePaths.length === 0) return;

    const filePath = filePaths[0];
    const fileName = `${Date.now()}_${filePath.split(/[/\\]/).pop()}`;
    const symName = symbols.find((s) => s.id === Number(symbolId))?.name || plan.stock_name || 'unnamed';
    const relativePath = await importChart(filePath, symName.toUpperCase(), fileName);
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
  const biasColor = plan.bias_tag ? STOCK_PLAN_BIAS_COLORS[plan.bias_tag] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">{t('back')}</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-gray-200">{plan.stock_name}</span>
          {biasColor && (
            <span className={`badge text-[10px] ${biasColor.bg} ${biasColor.text} border ${biasColor.border}`}>
              {plan.bias_tag}
            </span>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Delete this plan?</span>
                <button onClick={handleDelete} className="btn-primary text-xs px-3 py-1.5 bg-red-600 hover:bg-red-500">{t('delete')}</button>
                <button onClick={() => setConfirmDelete(false)} className="btn-ghost text-xs px-3 py-1.5">{t('cancel')}</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="btn-ghost text-xs text-red-400 hover:text-red-300">
                <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('delete')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Chart section */}
      <div className="glass-card p-4" tabIndex={0} onPaste={handlePaste} style={{ outline: 'none' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">{t('chartSnapshot')}</h3>
          <div className="flex items-center gap-3">
            {!readOnly && <span className="text-[10px] text-gray-600">Ctrl+V to paste</span>}
            {!readOnly && chartPath && (
              <button
                onClick={() => { setChartPath(null); setChartSrc(null); }}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                {t('remove')}
              </button>
            )}
            {!readOnly && (
              <button onClick={handleChartUpload} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {chartPath ? t('replace') : t('upload')}
              </button>
            )}
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Stock Name */}
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase">{t('stockName')}</label>
            <select
              value={symbolId}
              onChange={(e) => setSymbolId(e.target.value)}
              disabled={readOnly}
              className={`input-field text-sm ${readOnly ? 'opacity-60 cursor-default' : ''}`}
            >
              {symbols.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Timeframe */}
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase">{t('timeframe')}</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              disabled={readOnly}
              className={`input-field text-sm ${readOnly ? 'opacity-60 cursor-default' : ''}`}
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>

          {/* Plan Date */}
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase">{t('planDate')}</label>
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              readOnly={readOnly}
              className={`input-field text-sm ${readOnly ? 'opacity-60 cursor-default' : ''}`}
            />
          </div>
        </div>

        {/* Bias */}
        <div>
          <label className="block text-[10px] text-gray-500 mb-2 uppercase">{t('biasTag')}</label>
          <div className="flex flex-wrap gap-2">
            {STOCK_PLAN_BIAS_TAGS.map((tag) => {
              const colors = STOCK_PLAN_BIAS_COLORS[tag];
              const isActive = biasTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => { if (!readOnly) setBiasTag(isActive ? '' : tag); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    isActive
                      ? `${colors.bg} ${colors.text} ${colors.border}`
                      : `bg-surface-700 text-gray-400 border-surface-600 ${readOnly ? 'cursor-default' : 'hover:border-surface-500'}`
                  }`}
                >
                  {t(BIAS_KEY_MAP[tag])}
                </button>
              );
            })}
          </div>
        </div>

        {/* Analysis */}
        <div>
          <label className="block text-[10px] text-gray-500 mb-1 uppercase">{t('analysisLabel')}</label>
          <textarea
            value={analysis}
            onChange={(e) => setAnalysis(e.target.value)}
            placeholder="Describe your trade thesis, setup, and reasoning..."
            rows={4}
            readOnly={readOnly}
            className={`input-field text-sm resize-y ${readOnly ? 'opacity-60 cursor-default' : ''}`}
          />
        </div>

        {/* Price levels */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase">{t('entryPrice')}</label>
            <input
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="Price"
              readOnly={readOnly}
              className={`input-field text-sm ${readOnly ? 'opacity-60 cursor-default' : ''}`}
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase">{t('target')}</label>
            <input
              type="number"
              step="any"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="Price"
              readOnly={readOnly}
              className={`input-field text-sm ${readOnly ? 'opacity-60 cursor-default' : ''}`}
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase">{t('stopLoss')}</label>
            <input
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="Price"
              readOnly={readOnly}
              className={`input-field text-sm ${readOnly ? 'opacity-60 cursor-default' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Execution Status */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">{t('executionStatus')}</h3>
        <div className="flex gap-2">
          {EXECUTION_STATUSES.map((status) => {
            const colors = EXECUTION_STATUS_COLORS[status];
            const isActive = (plan.execution_status || 'Waiting') === status;
            return (
              <button
                key={status}
                onClick={() => !readOnly && handleStatusChange(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  isActive
                    ? `${colors.bg} ${colors.text} ${colors.border}`
                    : `bg-surface-700 text-gray-400 border-surface-600 ${readOnly ? 'cursor-default' : 'hover:border-surface-500'}`
                }`}
              >
                {t(status.toLowerCase())}
              </button>
            );
          })}
        </div>
      </div>

      {/* Save button — hidden in readOnly */}
      {!readOnly && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-6 py-2">
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                ...
              </span>
            ) : t('updatePlan')}
          </button>
        </div>
      )}

      {/* Meta info */}
      <div className="text-xs text-gray-600 text-right">
        {plan.updated_at !== plan.created_at && (
          <>Updated: {new Date(plan.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
        )}
      </div>
    </div>
  );
}
