import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../store/appStore';

const DHAN_EXCHANGE_SEGMENTS = ['NSE_FNO', 'IDX_I', 'NSE_EQ', 'BSE_EQ', 'BSE_FNO', 'NSE_CURRENCY', 'MCX_COMM'];
const DHAN_INSTRUMENT_TYPES  = ['FUTIDX', 'FUTSTK', 'INDEX', 'EQUITY'];

function defaultExchangeSegment(symbolName) {
  return symbolName.endsWith('FUT') ? 'NSE_FNO' : 'IDX_I';
}
function defaultInstrumentType(symbolName) {
  return symbolName.endsWith('FUT') ? 'FUTIDX' : 'INDEX';
}

function DhanConfigSection({ symbol, onSaved }) {
  const [secId,    setSecId]    = useState(symbol.dhan_security_id    ?? '');
  const [exchSeg,  setExchSeg]  = useState(DHAN_EXCHANGE_SEGMENTS.includes(symbol.dhan_exchange_segment) ? symbol.dhan_exchange_segment : defaultExchangeSegment(symbol.name));
  const [instrType, setInstrType] = useState(DHAN_INSTRUMENT_TYPES.includes(symbol.dhan_instrument_type) ? symbol.dhan_instrument_type : defaultInstrumentType(symbol.name));
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [saveErr,  setSaveErr]  = useState('');

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveErr('');
    try {
      await window.api.symbol.updateDhanConfig(symbol.id, {
        dhan_security_id:      secId.trim() || null,
        dhan_exchange_segment: exchSeg      || null,
        dhan_instrument_type:  instrType    || null,
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setSaveErr(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="mt-1 rounded-lg border px-3 py-3 space-y-3"
      style={{ background: 'rgba(30,33,48,0.8)', borderColor: 'rgba(99,107,153,0.35)' }}
    >
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Dhan API Config</p>
      <div className="flex gap-3 flex-wrap items-end">
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Security ID</label>
          <input
            type="text"
            value={secId}
            onChange={e => { setSecId(e.target.value); setSaved(false); }}
            placeholder="e.g. 13"
            className="input-field text-sm w-28"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Exchange Segment</label>
          <select
            value={exchSeg}
            onChange={e => { setExchSeg(e.target.value); setSaved(false); }}
            className="input-field text-sm"
          >
            {DHAN_EXCHANGE_SEGMENTS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Instrument</label>
          <select
            value={instrType}
            onChange={e => { setInstrType(e.target.value); setSaved(false); }}
            className="input-field text-sm"
          >
            {DHAN_INSTRUMENT_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs font-medium px-3 py-1.5 rounded transition-colors disabled:opacity-40"
          style={{ background: 'rgba(0,119,187,0.2)', color: '#7ab8e8', border: '1px solid rgba(0,119,187,0.3)' }}
        >
          {saving ? '…' : 'Save'}
        </button>
      </div>
      {saved   && <p className="text-[11px] text-emerald-400">Saved.</p>}
      {saveErr && <p className="text-[11px] text-red-400">{saveErr}</p>}
    </div>
  );
}

function SymbolRow({ symbol, onRenamed, onRemoved, onSymbolUpdated }) {
  const [editing,       setEditing]       = useState(false);
  const [draft,         setDraft]         = useState(symbol.name);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [showDhanCfg,   setShowDhanCfg]   = useState(false);
  const inputRef = useRef(null);

  const startEdit = () => {
    setDraft(symbol.name);
    setError('');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
  };

  const commitEdit = async () => {
    const name = draft.trim().toUpperCase();
    if (!name) { setError('Name cannot be empty.'); return; }
    if (name === symbol.name) { setEditing(false); return; }
    setSaving(true);
    setError('');
    try {
      await window.api.symbol.rename(symbol.id, name);
      onRenamed();
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Rename failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  commitEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-700/40 border border-surface-600/40">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={e => { setDraft(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={handleKeyDown}
            disabled={saving}
            className="input-field text-sm flex-1 mr-2 py-1"
          />
        ) : (
          <span className="text-sm font-medium text-gray-200">{symbol.name}</span>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <>
              <button
                onClick={commitEdit}
                disabled={saving}
                className="text-xs font-medium px-2.5 py-1 rounded transition-colors disabled:opacity-40"
                style={{ background: 'rgba(0,119,187,0.2)', color: '#7ab8e8', border: '1px solid rgba(0,119,187,0.3)' }}
              >
                {saving ? '…' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowDhanCfg(v => !v)}
                className="text-xs text-indigo-400/70 hover:text-indigo-300 transition-colors"
              >
                {showDhanCfg ? 'Hide API Config' : 'API Config'}
              </button>
              <button
                onClick={startEdit}
                className="text-xs text-gray-500 hover:text-gray-200 transition-colors"
              >
                Rename
              </button>
              <button
                onClick={() => onRemoved(symbol.id, symbol.name)}
                className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </>
          )}
        </div>
      </div>
      {error && <p className="text-[11px] text-red-400 pl-3">{error}</p>}
      {showDhanCfg && (
        <DhanConfigSection symbol={symbol} onSaved={onSymbolUpdated} />
      )}
    </div>
  );
}

export default function SymbolsView() {
  const { loadSymbols } = useApp();
  const [symbols, setSymbols] = useState([]);
  const [newName, setNewName] = useState('');
  const [error,   setError]   = useState('');
  const [adding,  setAdding]  = useState(false);

  const reload = async () => {
    const list = await window.api.symbol.getActive();
    setSymbols(list);
  };

  useEffect(() => { reload(); }, []);

  const handleAdd = async () => {
    const name = newName.trim().toUpperCase();
    if (!name) return;
    if (symbols.some(s => s.name.toUpperCase() === name)) {
      setError(`"${name}" already exists.`);
      return;
    }
    setAdding(true);
    setError('');
    try {
      await window.api.symbol.create(name);
      setNewName('');
      await reload();
      await loadSymbols();
    } catch (err) {
      setError(err.message || 'Failed to add symbol.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id, name) => {
    if (!window.confirm(`Remove "${name}"? It will no longer appear in Intraday or Swing views.`)) return;
    await window.api.symbol.setInactive(id);
    await reload();
    await loadSymbols();
  };

  const handleRenamed = async () => {
    await reload();
    await loadSymbols();
  };

  return (
    <div className="space-y-5 max-w-md">
      {/* Add symbol */}
      <div className="glass-card p-4 space-y-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add Symbol</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => { setNewName(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. BANKNIFTY"
            className="input-field text-sm flex-1"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || adding}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600/20 border border-primary-500/30 text-primary-300 hover:bg-primary-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <p className="text-xs text-gray-600">
          Symbols added here appear in both Intraday and Swing export selectors.
        </p>
      </div>

      {/* Active symbols */}
      <div className="glass-card p-4 space-y-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Active Symbols
          <span className="ml-2 text-gray-600 normal-case font-normal">({symbols.length})</span>
        </span>

        {symbols.length === 0 ? (
          <p className="text-sm text-gray-500">No symbols yet. Add one above.</p>
        ) : (
          <div className="space-y-1.5">
            {symbols.map(s => (
              <SymbolRow
                key={s.id}
                symbol={s}
                onRenamed={handleRenamed}
                onRemoved={handleRemove}
                onSymbolUpdated={reload}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
