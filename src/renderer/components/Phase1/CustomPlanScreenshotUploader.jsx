import React, { useRef, useState } from 'react';
import { useApp } from '../../store/appStore';
import { useCustomPlan } from '../../hooks/useCustomPlan';

export default function CustomPlanScreenshotUploader({ customPlanId, screenshots, tradingDay, onRefresh }) {
  const { addScreenshot, deleteScreenshot } = useCustomPlan();
  const { selectedSymbol, showNotification } = useApp();
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async () => {
    const filePaths = await window.api.dialog.openFile();
    if (!filePaths || filePaths.length === 0) return;

    setUploading(true);
    try {
      for (const filePath of filePaths) {
        const fileName = filePath.split(/[/\\]/).pop();
        const uniqueName = `${Date.now()}_${fileName}`;
        await addScreenshot(customPlanId, filePath, selectedSymbol.name, tradingDay.trade_date, uniqueName);
      }
      showNotification(`${filePaths.length} screenshot(s) added`, 'success');
      onRefresh();
    } catch (err) {
      showNotification('Failed to upload screenshot', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (screenshotId) => {
    await deleteScreenshot(screenshotId);
    showNotification('Screenshot removed', 'info');
    onRefresh();
  };

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
        const fileName = `paste_${Date.now()}.${ext}`;

        try {
          const relativePath = await window.api.image.saveBuffer(
            uint8Array, selectedSymbol.name, tradingDay.trade_date, fileName
          );
          await window.api.customPlanScreenshot.create({
            customPlanId,
            filePath: relativePath,
          });
          showNotification('Screenshot pasted', 'success');
          onRefresh();
        } catch (err) {
          showNotification('Failed to paste screenshot', 'error');
        }
        return;
      }
    }
  };

  return (
    <div tabIndex={0} onPaste={handlePaste} className="outline-none">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] text-gray-500 uppercase">Screenshots</label>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600">Ctrl+V to paste</span>
          <button
            onClick={handleFileSelect}
            disabled={uploading}
            className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {uploading ? 'Uploading...' : 'Add'}
          </button>
        </div>
      </div>

      {screenshots && screenshots.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {screenshots.map((ss) => (
            <div key={ss.id} className="relative group">
              <ScreenshotThumb filePath={ss.file_path} />
              <button
                onClick={() => handleDelete(ss.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {(!screenshots || screenshots.length === 0) && (
        <button
          onClick={handleFileSelect}
          className="w-full border-2 border-dashed border-surface-500 rounded-lg p-3 text-center hover:border-primary-500/50 transition-colors group"
        >
          <svg className="w-8 h-8 text-surface-500 group-hover:text-primary-400/60 mx-auto mb-1 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="6" y1="4" x2="6" y2="20" strokeLinecap="round" />
            <rect x="4" y="7" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
            <line x1="12" y1="2" x2="12" y2="16" strokeLinecap="round" />
            <rect x="10" y="5" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
            <line x1="18" y1="6" x2="18" y2="22" strokeLinecap="round" />
            <rect x="16" y="10" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
          </svg>
          <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Drop chart screenshots, paste from clipboard, or click to browse</p>
        </button>
      )}
    </div>
  );
}

function ScreenshotThumb({ filePath }) {
  const [src, setSrc] = React.useState(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
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
    <button
      onClick={handleClick}
      className="relative group w-14 h-14 rounded-lg overflow-hidden border border-surface-500/60 hover:border-primary-400/60 transition-all duration-200 hover:shadow-md hover:shadow-primary-500/10 hover:scale-105"
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
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <svg className="w-5 h-5 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </>
      ) : (
        <div className="w-full h-full bg-surface-700 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="6" y1="4" x2="6" y2="20" strokeLinecap="round" />
            <rect x="4" y="7" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
            <line x1="12" y1="2" x2="12" y2="16" strokeLinecap="round" />
            <rect x="10" y="5" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
            <line x1="18" y1="6" x2="18" y2="22" strokeLinecap="round" />
            <rect x="16" y="10" width="4" height="6" rx="0.5" fill="currentColor" stroke="none" />
          </svg>
        </div>
      )}
    </button>
  );
}
