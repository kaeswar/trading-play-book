import React, { useState, useEffect } from 'react';

export default function BrokerIntegrationView() {
  const [clientId,    setClientId]    = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken,   setShowToken]   = useState(false);
  const [status,      setStatus]      = useState(null); // null | 'saving' | 'saved' | 'error'
  const [testStatus,  setTestStatus]  = useState(null); // null | 'testing' | { ok, msg }

  useEffect(() => {
    window.api.broker.getConfig().then(cfg => {
      setClientId(cfg.client_id ?? '');
      setAccessToken(cfg.access_token ?? '');
    });
  }, []);

  const handleTestConnection = async () => {
    setTestStatus('testing');
    try {
      const result = await window.api.broker.testConnection();
      setTestStatus({ ok: result.ok, msg: result.ok ? result.msg : result.error });
    } catch {
      setTestStatus({ ok: false, msg: 'Unexpected error during connection test.' });
    }
  };

  const handleSave = async () => {
    setStatus('saving');
    try {
      await window.api.broker.setConfig({ client_id: clientId, access_token: accessToken });
      setStatus('saved');
      setTimeout(() => setStatus(null), 2500);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      {/* Broker badge */}
      <div className="flex items-center gap-3 p-3 rounded-lg border"
        style={{ background: '#0d1520', borderColor: '#1a2d40' }}>
        <div className="w-8 h-8 rounded flex items-center justify-center shrink-0"
          style={{ background: '#1e3a55' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#7ab8e8" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-200">Dhan</p>
          <p className="text-[11px] text-gray-500">API v2 — Trading & Market Data</p>
        </div>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: '#0a2a1a', color: '#4ade80', border: '1px solid #1a4a2a' }}>
          Active
        </span>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
            Client ID
          </label>
          <input
            type="text"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            placeholder="Enter your Dhan Client ID"
            className="input-field text-sm w-full font-mono"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
            Access Token
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={accessToken}
              onChange={e => setAccessToken(e.target.value)}
              placeholder="Paste your Dhan Access Token"
              className="input-field text-sm w-full font-mono pr-10"
            />
            <button
              onClick={() => setShowToken(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              tabIndex={-1}
              title={showToken ? 'Hide token' : 'Show token'}
            >
              {showToken ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-600 mt-1">
            Stored locally on your device. Not transmitted anywhere.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{ background: '#0077BB', color: '#fff' }}
        >
          {status === 'saving' ? 'Saving…' : 'Save Credentials'}
        </button>

        <button
          onClick={handleTestConnection}
          disabled={testStatus === 'testing'}
          className="px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-50 flex items-center gap-1.5"
          style={{ background: '#0d1520', borderColor: '#1a2d40', color: '#7ab8e8' }}
        >
          {testStatus === 'testing' ? (
            <div className="w-3 h-3 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {testStatus === 'testing' ? 'Testing…' : 'Test Connection'}
        </button>
      </div>

      {/* Status messages */}
      <div className="space-y-1.5">
        {status === 'saved' && (
          <p className="text-[12px] flex items-center gap-1.5" style={{ color: '#4ade80' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Credentials saved.
          </p>
        )}
        {status === 'error' && (
          <p className="text-[12px]" style={{ color: '#e07070' }}>Failed to save. Try again.</p>
        )}
        {testStatus && testStatus !== 'testing' && (
          <p className="text-[12px] flex items-start gap-1.5" style={{ color: testStatus.ok ? '#4ade80' : '#e07070' }}>
            <svg className="w-3.5 h-3.5 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              {testStatus.ok
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />}
            </svg>
            {testStatus.msg}
          </p>
        )}
      </div>
    </div>
  );
}
