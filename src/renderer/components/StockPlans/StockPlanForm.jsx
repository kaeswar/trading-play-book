import React, { useState, useEffect } from 'react';
import { useStockPlan } from '../../hooks/useStockPlan';
import { useApp } from '../../store/appStore';
import { TIMEFRAMES } from '../../../shared/constants';

export default function StockPlanForm({ onCreated, onCancel }) {
  const { createPlan, importChart } = useStockPlan();
  const { showNotification, symbols } = useApp();

  const [symbolId, setSymbolId] = useState('');
  const [timeframe, setTimeframe] = useState('Weekly');
  const [analysis, setAnalysis] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [chartFile, setChartFile] = useState(null);
  const [chartSrc, setChartSrc] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (symbols.length > 0 && !symbolId) setSymbolId(String(symbols[0].id));
  }, [symbols]);

  const handleChartUpload = async () => {
    const filePaths = await window.api.dialog.openFile();
    if (!filePaths || filePaths.length === 0) return;

    const filePath = filePaths[0];
    // Store the source file path, don't import yet
    setChartFile(filePath);
    // Show preview via data URL (avoids Electron file:/// security block)
    const dataUrl = await window.api.image.toDataUrl(filePath);
    if (dataUrl) setChartSrc(dataUrl);
  };

  const handleSubmit = async () => {
    const selectedSymbol = symbols.find((s) => s.id === Number(symbolId));
    if (!selectedSymbol) {
      showNotification('Please select a symbol', 'error');
      return;
    }
    setSaving(true);
    try {
      let chartPath = null;
      if (chartFile) {
        const fileName = `${Date.now()}_${chartFile.split(/[/\\]/).pop()}`;
        chartPath = await importChart(chartFile, selectedSymbol.name, fileName);
      }

      const plan = await createPlan({
        symbolId: selectedSymbol.id,
        stockName: selectedSymbol.name,
        timeframe,
        analysis: analysis.trim(),
        entryPrice: entryPrice ? parseFloat(entryPrice) : null,
        targetPrice: targetPrice ? parseFloat(targetPrice) : null,
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        chartPath,
      });
      if (plan) {
        showNotification('Plan created', 'success');
        onCreated(plan.id);
      }
    } catch (err) {
      showNotification('Failed to create plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">Cancel</span>
        </button>
      </div>

      <div className="glass-card p-5 space-y-4">
        <h3 className="text-base font-semibold text-gray-200">New Stock Swing Plan</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stock Name */}
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase">Stock Name</label>
            <select
              value={symbolId}
              onChange={(e) => setSymbolId(e.target.value)}
              className="input-field text-sm"
            >
              {symbols.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
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

        {/* Chart upload */}
        <div>
          <label className="block text-[10px] text-gray-500 mb-1 uppercase">Chart Snapshot</label>
          {chartSrc ? (
            <div className="relative">
              <img src={chartSrc} alt="Chart" className="w-full max-h-48 object-contain rounded-lg border border-surface-500/60" onError={() => setChartSrc(null)} />
              <button
                onClick={handleChartUpload}
                className="absolute top-2 right-2 text-xs bg-surface-800/90 text-gray-300 px-2 py-1 rounded hover:bg-surface-700 transition-colors"
              >
                Replace
              </button>
            </div>
          ) : (
            <button
              onClick={handleChartUpload}
              className="w-full border-2 border-dashed border-surface-500 rounded-lg p-4 text-center hover:border-primary-500/50 transition-colors group"
            >
              <svg className="w-8 h-8 text-surface-500 group-hover:text-primary-400/60 mx-auto mb-1 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <line x1="6" y1="4" x2="6" y2="20" strokeLinecap="round" />
                <rect x="4" y="7" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
                <line x1="12" y1="2" x2="12" y2="16" strokeLinecap="round" />
                <rect x="10" y="5" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
                <line x1="18" y1="6" x2="18" y2="22" strokeLinecap="round" />
                <rect x="16" y="10" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
              </svg>
              <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Click to upload chart</p>
            </button>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="btn-ghost text-sm px-4 py-2">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary text-sm px-6 py-2">
          {saving ? 'Creating...' : 'Create Plan'}
        </button>
      </div>
    </div>
  );
}
