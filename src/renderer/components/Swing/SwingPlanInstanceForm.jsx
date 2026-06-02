import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../store/appStore';
import { useLanguage } from '../../hooks/useLanguage';
import { useSwingPlan } from '../../hooks/useSwingPlan';
import {
  TIMEFRAMES, TIMEFRAME_COLORS,
  STOCK_PLAN_BIAS_COLORS, BEHAVIOR_TAGS, deriveBehaviorTag,
  getToday,
} from '../../../shared/constants';
import StyledDatePicker from '../shared/StyledDatePicker';

// Opens after a template is picked from the Plan Store.
// Collects swing-specific instance fields + optional setup screenshots, then creates the swing_plan row.
export default function SwingPlanInstanceForm({ template, onSaved, onClose }) {
  const { symbols, showNotification } = useApp();
  const { t } = useLanguage();
  const { createFromTemplate, addScreenshotFromBuffer } = useSwingPlan();
  const fileInputRef = useRef(null);

  const [symbolId, setSymbolId]       = useState(symbols[0]?.id || '');
  const [planDate, setPlanDate]       = useState(getToday());
  const [timeframe, setTimeframe]     = useState('Daily');
  const [entryPrice, setEntryPrice]   = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [stopLoss, setStopLoss]       = useState('');
  const [analysis, setAnalysis]       = useState('');
  const [stagedShots, setStagedShots] = useState([]);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    if (!symbolId && symbols.length > 0) setSymbolId(symbols[0].id);
  }, [symbols, symbolId]);

  if (!template) return null;

  const biasColors = STOCK_PLAN_BIAS_COLORS[template.bias];
  const tag = deriveBehaviorTag(template.bias, template.behavior_tag);
  const tagColors = tag && tag !== template.bias ? BEHAVIOR_TAGS[tag] : null;

  const stageFile = (file) => {
    if (!file) return;
    // createObjectURL is synchronous — state updates immediately, no async gap.
    const dataUrl = URL.createObjectURL(file);
    setStagedShots([{ id: `${Date.now()}`, dataUrl, file, fileName: file.name }]);
  };

  const handleFiles = (files) => stageFile(Array.from(files).find((f) => f.type.startsWith('image/')));

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        if (stagedShots[0] && !window.confirm('Replace the existing screenshot?')) return;
        stageFile(item.getAsFile());
        return;
      }
    }
  };

  const handleSave = async () => {
    if (!symbolId)  { setError('Symbol is required'); return; }
    if (!timeframe) { setError('Timeframe is required'); return; }
    setError('');
    setSaving(true);
    try {
      const swingPlan = await createFromTemplate({
        templateId:  template.id,
        symbolId:    Number(symbolId),
        planDate,
        timeframe,
        entryPrice:  toNum(entryPrice),
        targetPrice: toNum(targetPrice),
        stopLoss:    toNum(stopLoss),
        analysis:    analysis.trim() || null,
      });

      // Upload staged setup screenshot (non-fatal if it fails)
      const shot = stagedShots[0];
      if (shot) {
        try {
          const arrayBuffer = await shot.file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const symbolName = symbols.find((s) => s.id === Number(symbolId))?.name || '';
          await addScreenshotFromBuffer(swingPlan.id, uint8Array, symbolName, planDate, `${Date.now()}_${shot.fileName}`, 'setup');
        } catch (_) { /* ignore upload error */ }
      }

      showNotification('Swing plan created', 'success');
      if (onSaved) onSaved(swingPlan);
    } catch (err) {
      setError(err.message || 'Failed to create swing plan');
      showNotification(err.message || 'Failed to create swing plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-800 border border-surface-600 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header — template context */}
        <div className="flex items-start justify-between px-5 py-3 border-b border-surface-600/50">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Template</p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <h2 className="text-base font-semibold text-gray-200 truncate">{template.name}</h2>
              {biasColors && (
                <span className={`text-[10px] px-2 py-0.5 rounded ${biasColors.bg} ${biasColors.text} ${biasColors.border} border`}>
                  {template.bias}
                </span>
              )}
              {tagColors && (
                <span className={`text-[10px] px-2 py-0.5 rounded ${tagColors.bg} ${tagColors.text} ${tagColors.border} border`}>
                  {tag}
                </span>
              )}
            </div>
            {template.description && (
              <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{template.description}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 transition-colors ml-3 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Symbol + Plan Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Symbol *</Label>
              <select
                value={symbolId}
                onChange={(e) => setSymbolId(e.target.value)}
                className="input-field text-sm w-full"
              >
                {symbols.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Plan Date *</Label>
              <StyledDatePicker value={planDate} onChange={setPlanDate} />
            </div>
          </div>

          {/* Timeframe chips */}
          <div>
            <Label>Timeframe *</Label>
            <div className="flex flex-wrap gap-2">
              {TIMEFRAMES.map((tf) => {
                const c = TIMEFRAME_COLORS[tf];
                const active = timeframe === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      active
                        ? `${c.bg} ${c.text} ${c.border} font-medium`
                        : 'bg-surface-800 border-surface-600 text-gray-400 hover:border-surface-500'
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Entry / Target / Stop */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Entry Price</Label>
              <input
                type="number" step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="Entry"
                className="input-field text-sm w-full"
              />
            </div>
            <div>
              <Label>Target</Label>
              <input
                type="number" step="any"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Target"
                className="input-field text-sm w-full"
              />
            </div>
            <div>
              <Label>Stop Loss</Label>
              <input
                type="number" step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Stop"
                className="input-field text-sm w-full"
              />
            </div>
          </div>

          {/* Analysis */}
          <div>
            <Label>Analysis (optional)</Label>
            <textarea
              value={analysis}
              onChange={(e) => setAnalysis(e.target.value)}
              rows={3}
              placeholder="Stock-specific narrative — pattern context, levels, supporting factors…"
              className="input-field text-sm w-full resize-none"
            />
          </div>

          {/* Setup Screenshot — staged locally, uploaded after plan creation */}
          <div tabIndex={0} onPaste={handlePaste} className="outline-none">
            <div className="flex items-center justify-between mb-1.5">
              <Label>Setup Screenshot (optional)</Label>
              {stagedShots[0] ? (
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-gray-600">Ctrl+V to replace</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => setStagedShots([])}
                    className="text-[11px] text-red-500/70 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-600">Ctrl+V</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-primary-400 hover:text-primary-300 flex items-center gap-0.5 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Attach
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { stageFile(e.target.files?.[0]); e.target.value = ''; }}
            />

            {stagedShots[0] ? (
              <div className="w-full aspect-video rounded-lg overflow-hidden border border-surface-500/60">
                <img src={stagedShots[0].dataUrl} alt="staged setup" className="w-full h-full object-cover" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-dashed border-surface-500/60 rounded-md p-3 text-center hover:border-primary-500/50 transition-colors group"
              >
                <p className="text-[10px] text-gray-600 group-hover:text-gray-400 transition-colors">
                  Paste or click to attach
                </p>
              </button>
            )}
            <p className="text-[9px] text-gray-600 italic mt-1">One chart screenshot allowed</p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-600/50 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors">
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !symbolId || !timeframe}
            className="px-5 py-1.5 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Create Swing Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">
      {children}
    </span>
  );
}

function toNum(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
