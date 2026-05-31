import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/appStore';
import StyledDatePicker from '../shared/StyledDatePicker';

const INTRADAY_MODES = [
  { id: 'bySymbol',    label: 'By Symbol' },
  { id: 'multiSymbol', label: 'Multi-Symbol' },
];

const SWING_STATUSES = ['Pass', 'Fail', 'Partial', 'Cancelled', 'Waiting'];

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

function ExportButtons({ isValid, exporting, onExportCSV, onExportPDF, hint }) {
  const spinner = (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
  return (
    <div className="space-y-3 pt-1">
      <div className="flex gap-3">
        <button
          onClick={onExportCSV}
          disabled={!isValid || exporting}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            isValid && !exporting
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-surface-700 border-surface-600 text-gray-600 cursor-not-allowed'
          }`}
        >
          {exporting ? spinner : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          Export as CSV
        </button>
        <button
          onClick={onExportPDF}
          disabled={!isValid || exporting}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            isValid && !exporting
              ? 'bg-primary-500/10 border-primary-500/30 text-primary-400 hover:bg-primary-500/20'
              : 'bg-surface-700 border-surface-600 text-gray-600 cursor-not-allowed'
          }`}
        >
          {exporting ? spinner : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          )}
          Export as PDF
        </button>
      </div>
      {hint && <p className="text-xs text-gray-600">{hint}</p>}
    </div>
  );
}

export default function ExportView() {
  const { symbols, showNotification } = useApp();

  const [activeTab, setActiveTab] = useState('intraday');

  // ── Intraday state ──
  const [mode, setMode] = useState('bySymbol');
  const [symbolId, setSymbolId] = useState('');
  const [symbolIds, setSymbolIds] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [dayFilter, setDayFilter] = useState('all');
  const [verdictBias, setVerdictBias] = useState('');
  const [possibilityDisplay, setPossibilityDisplay] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [intradayStatus, setIntradayStatus] = useState(null);

  // ── Swing state ──
  const [swingStockNames, setSwingStockNames] = useState([]);
  const [swingSelectedNames, setSwingSelectedNames] = useState([]);
  const [swingStatus, setSwingStatus] = useState('');
  const [swingDateFrom, setSwingDateFrom] = useState('');
  const [swingDateTo, setSwingDateTo] = useState('');
  const [swingIncludeAnalysis, setSwingIncludeAnalysis] = useState(false);
  const [swingExporting, setSwingExporting] = useState(false);
  const [swingStatusMsg, setSwingStatusMsg] = useState(null);

  useEffect(() => {
    if (symbols.length > 0) {
      const nifty = symbols.find((s) => s.name.toLowerCase() === 'nifty') || symbols[0];
      setSymbolId(String(nifty.id));
      setSymbolIds([nifty.id]);
    }
  }, [symbols]);

  useEffect(() => {
    window.api.stockPlan.getDistinctStockNames().then((names) => {
      setSwingStockNames(names);
      setSwingSelectedNames(names);
    });
  }, []);

  // ── Intraday helpers ──
  const toggleSymbol = (id) =>
    setSymbolIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  const intradayIsValid = () => {
    if (mode === 'bySymbol')    return !!symbolId;
    if (mode === 'multiSymbol') return symbolIds.length > 0;
    return false;
  };

  const buildIntradayParams = () => {
    const selected =
      mode === 'multiSymbol'
        ? symbols.filter((s) => symbolIds.includes(s.id))
        : [symbols.find((s) => s.id === Number(symbolId))].filter(Boolean);
    return {
      symbolIds:        selected.map((s) => s.id),
      symbolNames:      selected.map((s) => s.name),
      dateFrom:         dateFrom || undefined,
      dateTo:           dateTo   || undefined,
      includeNotes,
      dayFilter,
      verdictBias:      verdictBias || undefined,
      possibilityDisplay,
    };
  };

  const handleIntradayExport = async (format) => {
    if (!intradayIsValid() || exporting) return;
    setExporting(true);
    setIntradayStatus(null);
    try {
      const params = buildIntradayParams();
      const result = format === 'csv'
        ? await window.api.export.toCSV(params)
        : await window.api.export.toPDF(params);
      if (result.canceled) {
        setIntradayStatus(null);
      } else if (result.success) {
        setIntradayStatus({ type: 'success', message: `Exported to ${result.filePath}` });
        showNotification(`${format.toUpperCase()} exported`, 'success');
      } else {
        setIntradayStatus({ type: 'error', message: result.error || 'Export failed.' });
      }
    } catch (err) {
      setIntradayStatus({ type: 'error', message: err.message || 'Export failed.' });
    } finally {
      setExporting(false);
    }
  };

  // ── Swing helpers ──
  const toggleSwingName = (name) =>
    setSwingSelectedNames((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);

  const handleSwingExport = async (format) => {
    if (swingSelectedNames.length === 0 || swingExporting) return;
    setSwingExporting(true);
    setSwingStatusMsg(null);
    try {
      const params = {
        stockNames:      swingSelectedNames,
        executionStatus: swingStatus || undefined,
        dateFrom:        swingDateFrom || undefined,
        dateTo:          swingDateTo   || undefined,
        includeAnalysis: swingIncludeAnalysis,
      };
      const result = format === 'csv'
        ? await window.api.export.swingToCSV(params)
        : await window.api.export.swingToPDF(params);
      if (result.canceled) {
        setSwingStatusMsg(null);
      } else if (result.success) {
        setSwingStatusMsg({ type: 'success', message: `Exported to ${result.filePath}` });
        showNotification(`${format.toUpperCase()} exported`, 'success');
      } else {
        setSwingStatusMsg({ type: 'error', message: result.error || 'Export failed.' });
      }
    } catch (err) {
      setSwingStatusMsg({ type: 'error', message: err.message || 'Export failed.' });
    } finally {
      setSwingExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Tab switcher + intraday mode selector on the same row */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 p-1 bg-surface-800 rounded-lg">
          {[
            { id: 'intraday', label: 'Intraday' },
            { id: 'swing',    label: 'Swing Plans' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setIntradayStatus(null); setSwingStatusMsg(null); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'intraday' && (
          <div className="flex gap-1 p-1 bg-surface-800 rounded-lg">
            {INTRADAY_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setIntradayStatus(null); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === m.id ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ──────────── Intraday tab ──────────── */}
      {activeTab === 'intraday' && mode === 'bySymbol' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Left — scope + plan selection */}
          <div className="space-y-4">
            <div className="glass-card p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Symbol</label>
                <select value={symbolId} onChange={(e) => setSymbolId(e.target.value)} className="input-field text-sm w-full">
                  {symbols.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">From Date</label>
                  <StyledDatePicker value={dateFrom} onChange={setDateFrom} placeholderText="Start date" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">To Date</label>
                  <StyledDatePicker value={dateTo} onChange={setDateTo} placeholderText="End date" />
                </div>
              </div>
            </div>

            {/* Plan Selection */}
            <div className="glass-card p-4 space-y-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan Selection</span>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Day Filter</label>
                <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className="input-field text-sm w-full">
                  <option value="all">All Days</option>
                  <option value="hasVerdict">Has Verdict</option>
                  <option value="hasPlan">Has Plan</option>
                  <option value="verdictHadPlan">Verdict Had Plan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Verdict Bias</label>
                <select
                  value={verdictBias}
                  onChange={(e) => setVerdictBias(e.target.value)}
                  disabled={dayFilter === 'hasPlan'}
                  className={`input-field text-sm w-full ${dayFilter === 'hasPlan' ? 'opacity-40' : ''}`}
                >
                  <option value="">All Directions</option>
                  <option value="Bullish">Bullish</option>
                  <option value="Bearish">Bearish</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Show Possibilities</label>
                <select value={possibilityDisplay} onChange={(e) => setPossibilityDisplay(e.target.value)} className="input-field text-sm w-full">
                  <option value="all">All Possibilities</option>
                  <option value="playedOut">Played-out Only</option>
                  <option value="planned">Planned Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right — notes + export */}
          <div className="space-y-4">
            <div className="glass-card p-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-3">Intraday Notes</span>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-surface-500 text-primary-500 focus:ring-primary-500/30 bg-surface-700 flex-shrink-0"
                />
                <div>
                  <span className="text-sm text-gray-200 font-medium">Include intraday notes</span>
                  <p className="text-xs text-gray-500 mt-0.5">Adds timestamped intraday notes. For CSV, condensed into one column.</p>
                </div>
              </label>
            </div>
            <StatusMessage status={intradayStatus} />
            <ExportButtons
              isValid={intradayIsValid()}
              exporting={exporting}
              onExportCSV={() => handleIntradayExport('csv')}
              onExportPDF={() => handleIntradayExport('pdf')}
              hint="CSV omits screenshots · PDF includes all data"
            />
          </div>
        </div>
      )}

      {activeTab === 'intraday' && mode === 'multiSymbol' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Left — symbols + dates + intraday notes */}
          <div className="space-y-4">
            <div className="glass-card p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbols
                    {symbols.length > 0 && (
                      <span className="ml-2 text-gray-600 normal-case font-normal">
                        ({symbolIds.length} of {symbols.length} selected)
                      </span>
                    )}
                  </label>
                  {symbols.length > 0 && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSymbolIds(symbols.map((s) => s.id))}
                        className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        Select All
                      </button>
                      <span className="text-gray-700">·</span>
                      <button
                        onClick={() => setSymbolIds([])}
                        className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        Deselect All
                      </button>
                    </div>
                  )}
                </div>
                <div className="border border-surface-600 rounded-lg overflow-y-auto max-h-40 bg-surface-700/30">
                  {symbols.map((s, idx) => (
                    <label
                      key={s.id}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-600/30 transition-colors ${
                        idx < symbols.length - 1 ? 'border-b border-surface-600/40' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={symbolIds.includes(s.id)}
                        onChange={() => toggleSymbol(s.id)}
                        className="w-4 h-4 rounded border-surface-500 text-primary-500 focus:ring-primary-500/30 bg-surface-700 flex-shrink-0"
                      />
                      <span className="text-sm text-gray-200">{s.name}</span>
                    </label>
                  ))}
                </div>
                {symbolIds.length === 0 && <p className="text-xs text-red-400 mt-1">Select at least one symbol</p>}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">From Date</label>
                  <StyledDatePicker value={dateFrom} onChange={setDateFrom} placeholderText="Start date" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                    To Date <span className="text-gray-600 normal-case">(optional)</span>
                  </label>
                  <StyledDatePicker value={dateTo} onChange={setDateTo} placeholderText="End date" />
                </div>
              </div>
            </div>

            {/* Intraday Notes */}
            <div className="glass-card p-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-3">Intraday Notes</span>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-surface-500 text-primary-500 focus:ring-primary-500/30 bg-surface-700 flex-shrink-0"
                />
                <div>
                  <span className="text-sm text-gray-200 font-medium">Include intraday notes</span>
                  <p className="text-xs text-gray-500 mt-0.5">Adds timestamped intraday notes. For CSV, condensed into one column.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Right — plan selection + export */}
          <div className="space-y-4">
            <div className="glass-card p-4 space-y-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan Selection</span>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Day Filter</label>
                <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className="input-field text-sm w-full">
                  <option value="all">All Days</option>
                  <option value="hasVerdict">Has Verdict</option>
                  <option value="hasPlan">Has Plan</option>
                  <option value="verdictHadPlan">Verdict Had Plan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Verdict Bias</label>
                <select
                  value={verdictBias}
                  onChange={(e) => setVerdictBias(e.target.value)}
                  disabled={dayFilter === 'hasPlan'}
                  className={`input-field text-sm w-full ${dayFilter === 'hasPlan' ? 'opacity-40' : ''}`}
                >
                  <option value="">All Directions</option>
                  <option value="Bullish">Bullish</option>
                  <option value="Bearish">Bearish</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Show Possibilities</label>
                <select value={possibilityDisplay} onChange={(e) => setPossibilityDisplay(e.target.value)} className="input-field text-sm w-full">
                  <option value="all">All Possibilities</option>
                  <option value="playedOut">Played-out Only</option>
                  <option value="planned">Planned Only</option>
                </select>
              </div>
            </div>
            <StatusMessage status={intradayStatus} />
            <ExportButtons
              isValid={intradayIsValid()}
              exporting={exporting}
              onExportCSV={() => handleIntradayExport('csv')}
              onExportPDF={() => handleIntradayExport('pdf')}
              hint="CSV omits screenshots · PDF includes all data"
            />
          </div>
        </div>
      )}

      {/* ──────────── Swing tab ──────────── */}
      {activeTab === 'swing' && (
        <div className="grid grid-cols-2 gap-6">

          {/* Left — stock listbox */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Names
                {swingStockNames.length > 0 && (
                  <span className="ml-2 text-gray-600 normal-case font-normal">
                    ({swingSelectedNames.length} of {swingStockNames.length} selected)
                  </span>
                )}
              </label>
              {swingStockNames.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSwingSelectedNames([...swingStockNames])}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Select All
                  </button>
                  <span className="text-gray-700">·</span>
                  <button
                    onClick={() => setSwingSelectedNames([])}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
              )}
            </div>

            {swingStockNames.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">No swing plans found. Create some in Swing · Plans first.</p>
            ) : (
              <div className="border border-surface-600 rounded-lg overflow-y-auto max-h-64 bg-surface-700/30">
                {swingStockNames.map((name, idx) => (
                  <label
                    key={name}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-600/30 transition-colors ${
                      idx < swingStockNames.length - 1 ? 'border-b border-surface-600/40' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={swingSelectedNames.includes(name)}
                      onChange={() => toggleSwingName(name)}
                      className="w-4 h-4 rounded border-surface-500 text-primary-500 focus:ring-primary-500/30 bg-surface-700 flex-shrink-0"
                    />
                    <span className="text-sm text-gray-200">{name}</span>
                  </label>
                ))}
              </div>
            )}
            {swingStockNames.length > 0 && swingSelectedNames.length === 0 && (
              <p className="text-xs text-red-400 mt-2">Select at least one stock</p>
            )}
          </div>

          {/* Right — filters + options + export */}
          <div className="space-y-4">
            <div className="glass-card p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Execution Status</label>
                <select
                  value={swingStatus}
                  onChange={(e) => setSwingStatus(e.target.value)}
                  className="input-field text-sm w-full"
                >
                  <option value="">All Statuses</option>
                  {SWING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                  From Date <span className="text-gray-600 normal-case">(optional)</span>
                </label>
                <StyledDatePicker value={swingDateFrom} onChange={setSwingDateFrom} placeholderText="Start date" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                  To Date <span className="text-gray-600 normal-case">(optional)</span>
                </label>
                <StyledDatePicker value={swingDateTo} onChange={setSwingDateTo} placeholderText="End date" />
              </div>
            </div>

            <div className="glass-card p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={swingIncludeAnalysis}
                  onChange={(e) => setSwingIncludeAnalysis(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-surface-500 text-primary-500 focus:ring-primary-500/30 bg-surface-700 flex-shrink-0"
                />
                <div>
                  <span className="text-sm text-gray-200 font-medium">Include analysis text</span>
                  <p className="text-xs text-gray-500 mt-0.5">Adds analysis column to CSV. PDF always shows analysis where available.</p>
                </div>
              </label>
            </div>

            <StatusMessage status={swingStatusMsg} />

            <ExportButtons
              isValid={swingSelectedNames.length > 0}
              exporting={swingExporting}
              onExportCSV={() => handleSwingExport('csv')}
              onExportPDF={() => handleSwingExport('pdf')}
              hint="CSV omits charts · PDF includes chart images"
            />
          </div>
        </div>
      )}

    </div>
  );
}
