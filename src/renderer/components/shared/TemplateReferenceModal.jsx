import React, { useState, useEffect } from 'react';
import {
  STOCK_PLAN_BIAS_COLORS, BEHAVIOR_TAGS, TRADE_TYPE_COLORS,
  deriveBehaviorTag,
} from '../../../shared/constants';

export default function TemplateReferenceModal({ template, onClose }) {
  const [imgSrc, setImgSrc]         = useState(null);
  const [imgLoading, setImgLoading] = useState(!!template.screenshot_path);

  const tag        = deriveBehaviorTag(template.bias, template.behavior_tag);
  const biasColors = template.bias ? STOCK_PLAN_BIAS_COLORS[template.bias] : null;
  const tagColors  = tag && tag !== template.bias ? BEHAVIOR_TAGS[tag] : null;
  const ttColors   = template.trade_type ? TRADE_TYPE_COLORS[template.trade_type] : null;

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (!template.screenshot_path) return;
    let cancelled = false;
    setImgLoading(true);
    window.api.image.getFullPath(template.screenshot_path).then(async (fullPath) => {
      if (cancelled || !fullPath) { setImgLoading(false); return; }
      const dataUrl = await window.api.image.toDataUrl(fullPath);
      if (!cancelled) { setImgSrc(dataUrl || null); setImgLoading(false); }
    });
    return () => { cancelled = true; };
  }, [template.screenshot_path]);

  const hasScreenshot  = !!template.screenshot_path;
  const hasDescription = !!template.description;

  return (
    <div className="fixed inset-0 z-[60] flex bg-black/80 backdrop-blur-sm">
      <div className="bg-surface-900 w-full h-full overflow-hidden flex flex-col">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-surface-700 shrink-0 bg-surface-800/80">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Close
            </button>
            <div className="w-px h-5 bg-surface-600 shrink-0" />
            <span className="text-[10px] text-gray-500 uppercase tracking-widest shrink-0">Plan Template</span>
          </div>
        </div>

        {/* ── Identity strip ── */}
        <div className="px-8 py-5 border-b border-surface-700/60 bg-surface-800/40 shrink-0">
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight mb-3">{template.name}</h1>
          <div className="flex items-center gap-2.5 flex-wrap">
            {biasColors && (
              <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${biasColors.bg} ${biasColors.text} ${biasColors.border}`}>
                {template.bias}
              </span>
            )}
            {tagColors && (
              <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${tagColors.bg} ${tagColors.text} ${tagColors.border}`}>
                {tag}
              </span>
            )}
            {ttColors && (
              <span className={`text-xs px-3 py-1 rounded-full border ${ttColors.bg} ${ttColors.text} ${ttColors.border}`}>
                {template.trade_type}
              </span>
            )}
            {template.group_name && (
              <span className="text-xs text-gray-400 border border-surface-600 px-3 py-1 rounded-full">
                {template.group_name}
              </span>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden flex">

          {/* Description panel */}
          {hasDescription && (
            <div className={`overflow-y-auto px-8 py-7 ${hasScreenshot ? 'w-2/5 border-r border-surface-700/50' : 'w-full max-w-3xl'}`}>
              <p className="text-[10px] text-teal-500 uppercase tracking-widest font-semibold mb-4">Description</p>
              <p className="text-base text-gray-300 leading-8 whitespace-pre-wrap">{template.description}</p>
            </div>
          )}

          {/* Screenshot panel */}
          {hasScreenshot && (
            <div className={`flex flex-col overflow-hidden ${hasDescription ? 'flex-1' : 'w-full'}`}>
              <div className="px-8 pt-7 pb-3 shrink-0">
                <p className="text-[10px] text-teal-500 uppercase tracking-widest font-semibold">Reference Chart</p>
              </div>
              <div className="flex-1 overflow-auto px-8 pb-8">
                {imgLoading ? (
                  <div className="w-full h-full min-h-[300px] rounded-xl border border-surface-700 bg-surface-800 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-teal-500" />
                      <span className="text-xs text-gray-600">Loading chart…</span>
                    </div>
                  </div>
                ) : imgSrc ? (
                  <img
                    src={imgSrc}
                    alt="Reference chart"
                    className="w-full rounded-xl border border-surface-700 object-contain shadow-xl"
                  />
                ) : (
                  <div className="w-full min-h-[300px] rounded-xl border border-dashed border-surface-600 bg-surface-800/50 flex items-center justify-center">
                    <span className="text-sm text-gray-600">Image could not be loaded</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!hasDescription && !hasScreenshot && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-600 italic">No additional details recorded for this template.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
