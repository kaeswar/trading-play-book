import React, { useState, useRef, useEffect } from 'react';
import { POSSIBILITIES, OUTCOMES, BIAS_COLORS, OUTCOME_COLORS, formatPossibilityCode } from '../../../shared/constants';

export default function VerdictForm({ tradingDay, existingVerdict, existingScreenshots = [], onSave, onCancel }) {
  const [selectedPossibility, setSelectedPossibility] = useState(existingVerdict?.possibility_code || '');
  const [selectedOutcome, setSelectedOutcome] = useState(existingVerdict?.outcome || '');
  const [notes, setNotes] = useState(existingVerdict?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [screenshots, setScreenshots] = useState(existingScreenshots || []);
  const textareaRef = useRef(null);

  // Sync existing screenshots when they change (e.g., on edit mode load)
  useEffect(() => {
    setScreenshots(existingScreenshots || []);
  }, [existingScreenshots]);

  const selectedSpec = POSSIBILITIES.find((p) => p.code === selectedPossibility);

  const handlePaste = async (e) => {
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
        const fileName = `verdict_paste_${Date.now()}.${ext}`;

        try {
          const symbolName = tradingDay?.symbol_name || 'UNKNOWN';
          const date = tradingDay?.trade_date || new Date().toISOString().split('T')[0];
          const relativePath = await window.api.image.saveBuffer(uint8Array, symbolName, date, fileName);
          setScreenshots((prev) => [...prev, { file_path: relativePath, _isNew: true }]);
        } catch (err) {
          console.error('Failed to save pasted image:', err);
        }
        return;
      }
    }
  };

  const handleAddFile = async () => {
    const filePaths = await window.api.dialog.openFile();
    if (!filePaths || filePaths.length === 0) return;

    for (const filePath of filePaths) {
      const fileName = filePath.split(/[/\\]/).pop();
      const uniqueName = `${Date.now()}_${fileName}`;
      const symbolName = tradingDay?.symbol_name || 'UNKNOWN';
      const date = tradingDay?.trade_date || new Date().toISOString().split('T')[0];

      try {
        const relativePath = await window.api.image.import(filePath, symbolName, date, uniqueName);
        setScreenshots((prev) => [...prev, { file_path: relativePath, _isNew: true }]);
      } catch (err) {
        console.error('Failed to import screenshot:', err);
      }
    }
  };

  const handleRemoveScreenshot = (index) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPossibility || !selectedOutcome) return;

    setSubmitting(true);
    try {
      await onSave({
        possibilityCode: selectedPossibility,
        outcome: selectedOutcome,
        bias: selectedSpec?.bias || '',
        notes,
        screenshots,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Possibility Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Which opening scenario occurred?
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {POSSIBILITIES.map((p) => {
            const biasColor = BIAS_COLORS[p.bias];
            const isSelected = selectedPossibility === p.code;

            return (
              <button
                key={p.code}
                type="button"
                onClick={() => setSelectedPossibility(p.code)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? `border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30`
                    : 'border-surface-500 bg-surface-700/50 hover:border-surface-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge text-[10px] ${biasColor.bg} ${biasColor.text} border ${biasColor.border}`}>
                    {p.bias}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-200">{formatPossibilityCode(p.code)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Outcome Selection */}
      {selectedPossibility && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            What was the outcome?
          </label>
          <div className="flex gap-3">
            {OUTCOMES.map((oc) => {
              const colors = OUTCOME_COLORS[oc];
              const isSelected = selectedOutcome === oc;

              return (
                <button
                  key={oc}
                  type="button"
                  onClick={() => setSelectedOutcome(oc)}
                  className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                    isSelected
                      ? `border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30`
                      : `border-surface-500 bg-surface-700/50 hover:border-surface-400`
                  }`}
                >
                  <p className={`text-sm font-semibold ${isSelected ? 'text-primary-400' : colors.text}`}>
                    {oc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes + Screenshots */}
      {selectedPossibility && selectedOutcome && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notes (optional)
          </label>
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onPaste={handlePaste}
            placeholder="Add observations about this trading day... (paste images from clipboard with Ctrl+V)"
            rows={3}
            className="input-field resize-none"
          />

          {/* Screenshot section */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-gray-500 uppercase">Screenshots</label>
              <button
                type="button"
                onClick={handleAddFile}
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>

            {screenshots.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {screenshots.map((ss, index) => (
                  <VerdictScreenshotThumb
                    key={ss.id || index}
                    filePath={ss.file_path}
                    onRemove={() => handleRemoveScreenshot(index)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-gray-600">Paste from clipboard or click Add to attach screenshots</p>
            )}
          </div>
        </div>
      )}

      {/* Submit */}
      {selectedPossibility && selectedOutcome && (
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-1"
          >
            {submitting ? 'Saving...' : existingVerdict ? 'Update Verdict' : 'Save Verdict'}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>
      )}
    </form>
  );
}

function VerdictScreenshotThumb({ filePath, onRemove }) {
  const [src, setSrc] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    window.api.image.getFullPath(filePath).then(async (fullPath) => {
      if (fullPath) {
        const dataUrl = await window.api.image.toDataUrl(fullPath);
        if (dataUrl) setSrc(dataUrl);
      }
    });
  }, [filePath]);

  const handleClick = () => {
    window.api.image.openViewer(filePath);
  };

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={handleClick}
        className="relative w-14 h-14 rounded-lg overflow-hidden border border-surface-500/60 hover:border-primary-400/60 transition-all duration-200 hover:shadow-md hover:shadow-primary-500/10 hover:scale-105"
      >
        {src ? (
          <>
            <img
              src={src}
              alt="Screenshot"
              className={`w-full h-full object-cover transition-all duration-200 group-hover:brightness-75 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setLoaded(true)}
              onError={() => setSrc(null)}
            />
            {!loaded && (
              <div className="absolute inset-0 bg-surface-700 animate-pulse rounded-lg" />
            )}
          </>
        ) : (
          <div className="w-full h-full bg-surface-700 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
