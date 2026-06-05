import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/appStore';
import StyledDatePicker from '../shared/StyledDatePicker';

const INTRADAY_MODES = [
  { id: 'bySymbol',    label: 'By Symbol' },
  { id: 'multiSymbol', label: 'Multi-Symbol' },
];

const SWING_STATUSES = ['Waiting', 'Successful', 'Failed', 'Cancelled', 'Cost-to-Cost', 'UnPlanned', 'In-Active'];

function buildPwFileName(templates, templateId) {
  const now  = new Date();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mmm  = now.toLocaleString('en-US', { month: 'short' });
  const yyyy = now.getFullYear();
  const raw  = templates.find((t) => String(t.id) === templateId)?.name || 'Plan-Name';
  const safe = raw.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
  return `Export_${dd}_${mmm}_${yyyy}_${safe}_TradingPlayBook_HH_MM_SS.csv`;
}

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
  const [exporting, setExporting] = useState(false);
  const [intradayStatus, setIntradayStatus] = useState(null);

  // ── Plan Wise state ──
  const [pwTemplates, setPwTemplates]       = useState([]);
  const [pwTemplateId, setPwTemplateId]     = useState('');
  const [pwSymbols, setPwSymbols]           = useState([]);
  const [pwSelectedIds, setPwSelectedIds]   = useState([]);
  const [pwExporting, setPwExporting]       = useState(false);
  const [pwStatusMsg, setPwStatusMsg]       = useState(null);

  // ── Swing state ──
  const [swingSymbols, setSwingSymbols] = useState([]);          // [{id, name}] — symbols with at least one plan
  const [swingSelectedIds, setSwingSelectedIds] = useState([]);  // currently checked
  const [swingStatus, setSwingStatus] = useState('');
  const [swingDateFrom, setSwingDateFrom] = useState('');
  const [swingDateTo, setSwingDateTo] = useState('');
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
    window.api.swingPlan.getDistinctSymbols().then((rows) => {
      const list = rows || [];
      setSwingSymbols(list);
      setSwingSelectedIds(list.map((s) => s.id));
    });
  }, []);

  const loadPwTemplates = () => {
    if (typeof window.api.swingPlan.getDistinctTemplates !== 'function') return;
    window.api.swingPlan.getDistinctTemplates().then((rows) => {
      const list = rows || [];
      setPwTemplates(list);
      setPwTemplateId((current) => {
        if (list.length === 0) return '';
        const stillValid = list.some((t) => String(t.id) === current);
        return stillValid ? current : String(list[0].id);
      });
    });
  };

  useEffect(() => {
    if (activeTab !== 'planWise') return;
    loadPwTemplates();
  }, [activeTab]);

  useEffect(() => {
    if (!pwTemplateId) return;
    if (typeof window.api.swingPlan.getDistinctSymbolsByTemplate !== 'function') return;
    window.api.swingPlan.getDistinctSymbolsByTemplate(Number(pwTemplateId)).then((rows) => {
      const list = rows || [];
      setPwSymbols(list);
      setPwSelectedIds(list.map((s) => s.id));
    });
  }, [pwTemplateId]);

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
      symbolIds:   selected.map((s) => s.id),
      symbolNames: selected.map((s) => s.name),
      dateFrom:    dateFrom || undefined,
      dateTo:      dateTo   || undefined,
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

  // ── Plan Wise helpers ──
  const togglePwSymbol = (id) =>
    setPwSelectedIds((prev) => prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]);

  const handlePlanWiseExport = async () => {
    if (!pwTemplateId || pwSelectedIds.length === 0 || pwExporting) return;
    setPwExporting(true);
    setPwStatusMsg(null);
    try {
      const result = await window.api.export.planWiseToCSV({
        templateId: Number(pwTemplateId),
        symbolIds:  pwSelectedIds,
      });
      if (result.canceled) {
        setPwStatusMsg(null);
      } else if (result.success) {
        const fname = result.filePath.split(/[/\\]/).pop();
        setPwStatusMsg({ type: 'success', message: `Export complete — ${fname}` });
        showNotification('Export complete', 'success');
      } else {
        setPwStatusMsg({ type: 'error', message: result.error || 'Export failed.' });
      }
    } catch (err) {
      setPwStatusMsg({ type: 'error', message: err.message || 'Export failed.' });
    } finally {
      setPwExporting(false);
    }
  };

  // ── Swing helpers ──
  const toggleSwingSymbol = (id) =>
    setSwingSelectedIds((prev) => prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]);

  const handleSwingExport = async (format) => {
    if (swingSelectedIds.length === 0 || swingExporting) return;
    setSwingExporting(true);
    setSwingStatusMsg(null);
    try {
      const params = {
        symbolIds:       swingSelectedIds,
        executionStatus: swingStatus || undefined,
        dateFrom:        swingDateFrom || undefined,
        dateTo:          swingDateTo   || undefined,
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
            { id: 'intraday',  label: 'Intraday' },
            { id: 'swing',     label: 'Swing Plans' },
            { id: 'planWise',  label: 'Plan Wise' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setIntradayStatus(null); setSwingStatusMsg(null); setPwStatusMsg(null); }}
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

          </div>

          {/* Right — export */}
          <div className="space-y-4">
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

          </div>

          {/* Right — export */}
          <div className="space-y-4">
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

          {/* Left — symbol listbox */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Symbols
                {swingSymbols.length > 0 && (
                  <span className="ml-2 text-gray-600 normal-case font-normal">
                    ({swingSelectedIds.length} of {swingSymbols.length} selected)
                  </span>
                )}
              </label>
              {swingSymbols.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSwingSelectedIds(swingSymbols.map((s) => s.id))}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Select All
                  </button>
                  <span className="text-gray-700">·</span>
                  <button
                    onClick={() => setSwingSelectedIds([])}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
              )}
            </div>

            {swingSymbols.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">No swing plans found. Create some in Swing · Plans first.</p>
            ) : (
              <div className="border border-surface-600 rounded-lg overflow-y-auto max-h-64 bg-surface-700/30">
                {swingSymbols.map((s, idx) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-600/30 transition-colors ${
                      idx < swingSymbols.length - 1 ? 'border-b border-surface-600/40' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={swingSelectedIds.includes(s.id)}
                      onChange={() => toggleSwingSymbol(s.id)}
                      className="w-4 h-4 rounded border-surface-500 text-primary-500 focus:ring-primary-500/30 bg-surface-700 flex-shrink-0"
                    />
                    <span className="text-sm text-gray-200">{s.name}</span>
                  </label>
                ))}
              </div>
            )}
            {swingSymbols.length > 0 && swingSelectedIds.length === 0 && (
              <p className="text-xs text-red-400 mt-2">Select at least one symbol</p>
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

            <StatusMessage status={swingStatusMsg} />

            <ExportButtons
              isValid={swingSelectedIds.length > 0}
              exporting={swingExporting}
              onExportCSV={() => handleSwingExport('csv')}
              onExportPDF={() => handleSwingExport('pdf')}
              hint="CSV omits screenshots · PDF includes all data"
            />
          </div>
        </div>
      )}

      {/* ──────────── Plan Wise tab ──────────── */}
      {activeTab === 'planWise' && (
        <div className="grid grid-cols-2 gap-6">

          {/* Left — template picker + symbol list */}
          <div className="space-y-4">
            <div className="glass-card p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Plan (Template)</label>
                  <button onClick={loadPwTemplates} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">Refresh</button>
                </div>
                {pwTemplates.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">No plans with instances yet. Create swing plans first.</p>
                ) : (
                  <select
                    value={pwTemplateId}
                    onChange={(e) => setPwTemplateId(e.target.value)}
                    className="input-field text-sm w-full"
                  >
                    {pwTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}{t.group_name ? ` — ${t.group_name}` : ''} ({t.plan_count})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbols
                    {pwSymbols.length > 0 && (
                      <span className="ml-2 text-gray-600 normal-case font-normal">
                        ({pwSelectedIds.length} of {pwSymbols.length} selected)
                      </span>
                    )}
                  </label>
                  {pwSymbols.length > 0 && (
                    <div className="flex items-center gap-3">
                      <button onClick={() => setPwSelectedIds(pwSymbols.map((s) => s.id))} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">Select All</button>
                      <span className="text-gray-700">·</span>
                      <button onClick={() => setPwSelectedIds([])} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">Deselect All</button>
                    </div>
                  )}
                </div>

                {pwSymbols.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">
                    {pwTemplateId ? 'No instances of this plan exist yet.' : 'Select a plan above.'}
                  </p>
                ) : (
                  <div className="border border-surface-600 rounded-lg overflow-y-auto max-h-52 bg-surface-700/30">
                    {pwSymbols.map((s, idx) => (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-600/30 transition-colors ${
                          idx < pwSymbols.length - 1 ? 'border-b border-surface-600/40' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={pwSelectedIds.includes(s.id)}
                          onChange={() => togglePwSymbol(s.id)}
                          className="w-4 h-4 rounded border-surface-500 text-primary-500 focus:ring-primary-500/30 bg-surface-700 flex-shrink-0"
                        />
                        <span className="text-sm text-gray-200">{s.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                {pwSymbols.length > 0 && pwSelectedIds.length === 0 && (
                  <p className="text-xs text-red-400 mt-1">Select at least one symbol</p>
                )}
              </div>
            </div>
          </div>

          {/* Right — column preview + export */}
          <div className="space-y-4">
            <div className="glass-card p-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">CSV Columns</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Date', 'Symbol', 'Type', 'Bias', 'Target', 'Stop', 'Execution Status'].map((col) => (
                  <span key={col} className="text-[11px] px-2 py-0.5 rounded bg-surface-700 border border-surface-600 text-gray-400">{col}</span>
                ))}
              </div>
              <p className="text-[11px] text-gray-600 pt-1 break-all">
                File: <span className="text-gray-400 italic">{buildPwFileName(pwTemplates, pwTemplateId)}</span>
              </p>
            </div>

            <StatusMessage status={pwStatusMsg} />

            <button
              onClick={handlePlanWiseExport}
              disabled={!pwTemplateId || pwSelectedIds.length === 0 || pwExporting}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                pwTemplateId && pwSelectedIds.length > 0 && !pwExporting
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-surface-700 border-surface-600 text-gray-600 cursor-not-allowed'
              }`}
            >
              {pwExporting ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              Export as CSV
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
