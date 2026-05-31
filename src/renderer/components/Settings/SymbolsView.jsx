import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/appStore';

export default function SymbolsView() {
  const { loadSymbols } = useApp();
  const [symbols, setSymbols] = useState([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const reload = async () => {
    const list = await window.api.symbol.getActive();
    setSymbols(list);
  };

  useEffect(() => { reload(); }, []);

  const handleAdd = async () => {
    const name = newName.trim().toUpperCase();
    if (!name) return;
    if (symbols.some((s) => s.name.toUpperCase() === name)) {
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

  return (
    <div className="space-y-5 max-w-md">
      {/* Add symbol */}
      <div className="glass-card p-4 space-y-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add Symbol</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => { setNewName(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
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
          <div className="space-y-1">
            {symbols.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-700/40 border border-surface-600/40"
              >
                <span className="text-sm font-medium text-gray-200">{s.name}</span>
                <button
                  onClick={() => handleRemove(s.id, s.name)}
                  className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
