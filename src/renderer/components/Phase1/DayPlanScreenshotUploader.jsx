import React, { useState } from 'react';
import { useApp } from '../../store/appStore';
import { useDayPlan } from '../../hooks/useDayPlan';

// Single-screenshot uploader for a day_plan — one per kind (setup | outcome).
// When a screenshot exists: show full-width thumbnail with Replace + Remove controls.
// When empty: show dashed drop-zone (click or paste).
export default function DayPlanScreenshotUploader({
  dayPlanId, screenshots, tradingDay, onRefresh,
  kind = 'setup', label = 'Screenshot', disabled = false,
}) {
  const { addScreenshot, addScreenshotFromBuffer, deleteScreenshot } = useDayPlan();
  const { selectedSymbol, showNotification } = useApp();
  const [uploading, setUploading] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);

  const existing = screenshots?.[0] ?? null;
  const hasScreenshot = !!existing || justUploaded;

  const symbolName = selectedSymbol?.name || '';
  const tradeDate  = tradingDay?.trade_date || '';

  const uploadFile = async (filePath) => {
    const fileName = filePath.split(/[/\\]/).pop();
    await addScreenshot(dayPlanId, filePath, symbolName, tradeDate, `${Date.now()}_${fileName}`, kind);
  };

  const uploadBuffer = async (uint8Array, fileName) => {
    await addScreenshotFromBuffer(dayPlanId, uint8Array, symbolName, tradeDate, fileName, kind);
  };

  const replaceWith = async (doUpload) => {
    setUploading(true);
    try {
      if (existing) await deleteScreenshot(existing.id);
      await doUpload();
      setJustUploaded(true);
      await onRefresh();
    } catch (err) {
      console.error('[Screenshot] upload failed:', err);
      setJustUploaded(false);
      showNotification(`Failed to attach screenshot: ${err?.message || err}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async () => {
    if (disabled) return;
    const filePaths = await window.api.dialog.openFile();
    if (!filePaths || filePaths.length === 0) return;
    await replaceWith(() => uploadFile(filePaths[0]));
  };

  const handleDelete = async () => {
    if (disabled || !existing) return;
    await deleteScreenshot(existing.id);
    setJustUploaded(false);
    showNotification('Screenshot removed', 'info');
    await onRefresh();
  };

  const handlePaste = async (e) => {
    if (disabled) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        if (existing && !window.confirm('Replace the existing screenshot?')) return;
        const file = item.getAsFile();
        if (!file) return;
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array  = new Uint8Array(arrayBuffer);
        const ext      = item.type.split('/')[1] === 'jpeg' ? 'jpg' : item.type.split('/')[1];
        const fileName = `paste_${Date.now()}.${ext}`;
        await replaceWith(() => uploadBuffer(uint8Array, fileName));
        return;
      }
    }
  };

  return (
    <div tabIndex={disabled ? undefined : 0} onPaste={handlePaste} className="outline-none">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</span>
        {!disabled && hasScreenshot && (
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-gray-600">Ctrl+V to replace</span>
            <button
              onClick={handleFileSelect}
              disabled={uploading}
              className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors"
            >
              {uploading ? '…' : 'Replace'}
            </button>
            <button
              onClick={handleDelete}
              disabled={!existing}
              className="text-[11px] text-red-500/70 hover:text-red-400 transition-colors disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        )}
        {!disabled && !hasScreenshot && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-gray-600">Ctrl+V</span>
            <button
              onClick={handleFileSelect}
              disabled={uploading}
              className="text-[11px] text-primary-400 hover:text-primary-300 flex items-center gap-0.5 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {uploading ? '…' : 'Attach'}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {existing ? (
        <Thumb filePath={existing.file_path} />
      ) : justUploaded ? (
        <div className="w-full aspect-video rounded-lg bg-surface-700 animate-pulse" />
      ) : disabled ? (
        <p className="text-[10px] text-gray-600 italic">No screenshot</p>
      ) : (
        <button
          onClick={handleFileSelect}
          className="w-full border border-dashed border-surface-500/60 rounded-md p-3 text-center hover:border-primary-500/50 transition-colors group"
        >
          <p className="text-[10px] text-gray-600 group-hover:text-gray-400 transition-colors">
            Paste or click to attach
          </p>
        </button>
      )}
      {!disabled && (
        <p className="text-[9px] text-gray-600 italic mt-1">One chart screenshot allowed</p>
      )}
    </div>
  );
}

function Thumb({ filePath }) {
  const [src, setSrc]       = React.useState(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    window.api.image.getFullPath(filePath).then(async (fullPath) => {
      if (!fullPath) return;
      const dataUrl = await window.api.image.toDataUrl(fullPath);
      if (dataUrl) setSrc(dataUrl);
    });
  }, [filePath]);

  return (
    <button
      onClick={() => window.api.image.openViewer(filePath)}
      className="w-full aspect-video rounded-lg overflow-hidden border border-surface-500/60 hover:border-primary-400/60 transition-all bg-surface-700 group"
    >
      {src ? (
        <img
          src={src}
          alt="Screenshot"
          className={`w-full h-full object-cover transition-all group-hover:scale-[1.01] ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <div className="w-full h-full bg-surface-700 animate-pulse" />
      )}
    </button>
  );
}
