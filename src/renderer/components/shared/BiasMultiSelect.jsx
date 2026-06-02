import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TEMPLATE_BIAS_TAGS, STOCK_PLAN_BIAS_COLORS } from '../../../shared/constants';
import { BIAS_KEY_MAP } from '../../../shared/i18n';
import { useLanguage } from '../../hooks/useLanguage';

const ALL_BULLISH = ['Super Bullish', 'Bullish', 'Possibly Bullish'];
const ALL_BEARISH = ['Super Bearish', 'Bearish', 'Possibly Bearish'];
const RANGE_ONLY = ['Range Bound'];

// Checkbox dropdown for filtering by multiple bias values.
// Renders the panel via React portal to escape any overflow:auto/hidden ancestors.
export default function BiasMultiSelect({ selected, onChange }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const recompute = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const panelHeight = 320;
    const spaceBelow = window.innerHeight - r.bottom;
    const dropUp = spaceBelow < panelHeight && r.top > panelHeight;
    setCoords({
      left: r.left,
      width: r.width,
      top: dropUp ? r.top - 4 : r.bottom + 4,
      dropUp,
    });
  }, []);

  useLayoutEffect(() => { if (open) recompute(); }, [open, recompute]);

  useEffect(() => {
    if (!open) return;
    const handle = () => recompute();
    window.addEventListener('resize', handle);
    // Recompute on any scroll (capture phase catches ancestor scrolls too)
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [open, recompute]);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e) => {
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  const toggle = (bias) => {
    const next = new Set(selected);
    if (next.has(bias)) next.delete(bias); else next.add(bias);
    onChange(next);
  };
  const setPreset = (list) => onChange(new Set(list));
  const clear = () => onChange(new Set());

  const triggerLabel = (() => {
    if (selected.size === 0) return t('biasFilterAll');
    if (selected.size === 1) {
      const only = [...selected][0];
      return t(BIAS_KEY_MAP[only]) || only;
    }
    return t('biasFilterCount').replace('{n}', selected.size);
  })();

  const panel = open && coords ? createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: coords.left,
        top: coords.dropUp ? undefined : coords.top,
        bottom: coords.dropUp ? (window.innerHeight - coords.top) : undefined,
        width: coords.width,
        zIndex: 100,
      }}
      className="bg-surface-800 border border-surface-500/50 rounded-lg shadow-xl overflow-hidden min-w-[220px]"
    >
      {/* Preset row */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-surface-600/40 bg-surface-900/40">
        <PresetBtn onClick={() => setPreset(ALL_BULLISH)}>{t('presetAllBullish')}</PresetBtn>
        <PresetBtn onClick={() => setPreset(RANGE_ONLY)}>{t('presetRangeBound')}</PresetBtn>
        <PresetBtn onClick={() => setPreset(ALL_BEARISH)}>{t('presetAllBearish')}</PresetBtn>
        <PresetBtn onClick={clear} variant="ghost">{t('presetClear')}</PresetBtn>
      </div>

      {/* Checkbox list */}
      <div className="max-h-72 overflow-y-auto py-1">
        {TEMPLATE_BIAS_TAGS.map((bias) => {
          const colors = STOCK_PLAN_BIAS_COLORS[bias];
          const isChecked = selected.has(bias);
          return (
            <label
              key={bias}
              className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-surface-700/40 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(bias)}
                className="rounded"
              />
              {colors && (
                <span className={`text-[10px] px-2 py-0.5 rounded ${colors.bg} ${colors.text} ${colors.border} border`}>
                  {t(BIAS_KEY_MAP[bias]) || bias}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input-field text-sm w-full text-left flex items-center justify-between gap-2"
      >
        <span className="truncate">{triggerLabel}</span>
        <svg
          className={`w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {panel}
    </>
  );
}

function PresetBtn({ onClick, variant, children }) {
  const base = 'text-[10px] px-2 py-1 rounded border transition-colors';
  const cls = variant === 'ghost'
    ? `${base} bg-surface-800 border-surface-600 text-gray-400 hover:border-surface-500`
    : `${base} bg-primary-600/15 border-primary-500/30 text-primary-300 hover:bg-primary-600/25`;
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
