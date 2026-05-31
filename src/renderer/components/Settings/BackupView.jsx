import React, { useState } from 'react';
import { useApp } from '../../store/appStore';
import { useLanguage } from '../../hooks/useLanguage';

function StatusMessage({ status }) {
  if (!status) return null;
  const isSuccess = status.type === 'success';
  return (
    <div className={`flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm border ${
      isSuccess
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        : 'bg-red-500/10 border-red-500/20 text-red-400'
    }`}>
      {isSuccess ? (
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <span className="break-all">{status.message}</span>
    </div>
  );
}

const Spinner = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export default function BackupView() {
  const { showNotification } = useApp();
  const { t } = useLanguage();

  const [backupBusy, setBackupBusy]     = useState(false);
  const [restoreBusy, setRestoreBusy]   = useState(false);
  const [backupStatus, setBackupStatus] = useState(null);
  const [restoreStatus, setRestoreStatus] = useState(null);

  const handleExport = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    setBackupStatus(null);
    try {
      const result = await window.api.backup.export();
      if (result.canceled) {
        setBackupStatus(null);
      } else if (result.success) {
        setBackupStatus({ type: 'success', message: `Backup saved to ${result.filePath}` });
        showNotification('Backup created', 'success');
      } else {
        setBackupStatus({ type: 'error', message: result.error || 'Backup failed.' });
      }
    } catch (err) {
      setBackupStatus({ type: 'error', message: err.message || 'Backup failed.' });
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImport = async () => {
    if (restoreBusy) return;
    setRestoreBusy(true);
    setRestoreStatus(null);
    try {
      const result = await window.api.backup.import();
      if (result.canceled) {
        setRestoreStatus(null);
      } else if (result.success) {
        const s = result.stats;
        const parts = [
          s.tradingDays   && `${s.tradingDays} days`,
          s.possibilities && `${s.possibilities} possibilities`,
          s.outcomePlans  && `${s.outcomePlans} outcome plans`,
          s.verdicts      && `${s.verdicts} verdicts`,
          s.customPlans   && `${s.customPlans} custom plans`,
          s.intradayNotes && `${s.intradayNotes} notes`,
          s.stockPlans    && `${s.stockPlans} swing plans`,
          s.screenshots   && `${s.screenshots} images`,
        ].filter(Boolean);
        const summary = parts.length
          ? `Imported: ${parts.join(', ')}. Reloading app…`
          : 'Nothing new to import — all records already exist.';
        setRestoreStatus({ type: 'success', message: summary });
        showNotification('Restore complete', 'success');
        if (parts.length) setTimeout(() => window.location.reload(), 2000);
      } else {
        setRestoreStatus({ type: 'error', message: result.error || 'Restore failed.' });
      }
    } catch (err) {
      setRestoreStatus({ type: 'error', message: err.message || 'Restore failed.' });
    } finally {
      setRestoreBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6">

      {/* Backup */}
      <div className="glass-card p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-200 block mb-1">{t('createBackupTitle')}</span>
            <p className="text-xs text-gray-500 leading-relaxed">
              Exports everything — trading days, swing plans, verdicts, notes, and all images — into a single{' '}
              <span className="text-gray-400 font-mono">.tpbj</span> file.
              Use it to safeguard your data or transfer it to another machine.
            </p>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={backupBusy}
          className={`mt-auto w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            !backupBusy
              ? 'bg-primary-500/10 border-primary-500/30 text-primary-400 hover:bg-primary-500/20'
              : 'bg-surface-700 border-surface-600 text-gray-600 cursor-not-allowed'
          }`}
        >
          {backupBusy ? <Spinner /> : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          )}
          {backupBusy ? t('creatingBackup') : t('createBackup')}
        </button>

        <StatusMessage status={backupStatus} />
      </div>

      {/* Restore */}
      <div className="glass-card p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-200 block mb-1">{t('restoreBackupTitle')}</span>
            <p className="text-xs text-gray-500 leading-relaxed">
              Imports a <span className="text-gray-400 font-mono">.tpbj</span> backup file.
              New records are merged into your current data — existing entries are not overwritten and nothing is deleted.
            </p>
          </div>
        </div>

        <button
          onClick={handleImport}
          disabled={restoreBusy}
          className={`mt-auto w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            !restoreBusy
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              : 'bg-surface-700 border-surface-600 text-gray-600 cursor-not-allowed'
          }`}
        >
          {restoreBusy ? <Spinner /> : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          )}
          {restoreBusy ? t('restoringBackup') : t('restoreBackup')}
        </button>

        <StatusMessage status={restoreStatus} />
      </div>

    </div>
  );
}
