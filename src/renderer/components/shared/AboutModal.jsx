import React from 'react';

export default function AboutModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card w-full max-w-lg mx-4 p-0 overflow-hidden animate-in max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Trading Play Book</h2>
                <span className="text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">v1.0</span>
              </div>
              <p className="text-xs text-white/70">Plan Profile · Free to use</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto">

          {/* About */}
          <p className="text-sm text-gray-300 leading-relaxed">
            A purpose-built desktop journal for traders who follow a disciplined, process-driven approach.
            It bridges pre-market planning with post-market review — building consistency and self-awareness
            in every trading decision.
          </p>

          {/* Donationware notice */}
          <div className="p-4 rounded-lg border border-primary-500/30 bg-primary-500/5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-300 mb-0.5">This app is Donationware</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Free to download and use forever. If it adds value to your trading journey,
                  a small donation helps keep this project alive and growing.
                </p>
              </div>
            </div>
          </div>

          {/* Donate QR */}
          <div className="p-4 bg-surface-700/50 rounded-lg text-center">
            <p className="text-xs text-gray-400 mb-3">Scan to support the project</p>
            <img
              src="/donate_qr.png"
              alt="Donate QR Code"
              className="w-36 h-36 mx-auto rounded-lg border border-surface-500/60"
            />
            <p className="text-[11px] text-gray-500 mt-2">Every contribution is deeply appreciated 🙏</p>
          </div>

          {/* Features */}
          <div className="p-3 bg-surface-700/50 rounded-lg space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">What's inside v1.0</p>
            <FeatureItem icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" text="Default Basic Plans — 6 Plan Profile opening scenarios with target, stop-out, and screenshots" />
            <FeatureItem icon="M12 4v16m8-8H4" text="Custom Plans — create your own trade plans with bias tags, price levels, and per-plan verdicts" />
            <FeatureItem icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" text="Post-Market Verdict — record what actually happened and review plan effectiveness" />
            <FeatureItem icon="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" text="Plan Analysis — behaviour tag mapping across all plans with date navigation" />
            <FeatureItem icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" text="Gallery & Metrics — filterable history, performance dashboard, and screenshot viewer" />
            <FeatureItem icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" text="Stock Swing Plans — standalone module for stock-level trade planning with execution tracking" />
          </div>

          {/* Author */}
          <div className="p-3 bg-surface-700/50 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Author</p>
              <p className="text-sm text-gray-200 font-medium">Kaeswar</p>
              <a href="mailto:kaeswar@gmail.com" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                kaeswar@gmail.com
              </a>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-end max-w-[200px]">
              {['Electron', 'React', 'Vite', 'Tailwind', 'SQLite'].map((tech) => (
                <span key={tech} className="text-[10px] bg-surface-600 text-gray-400 px-2 py-0.5 rounded-full">{tech}</span>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-surface-600/50 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Version 1.0.0</p>
            <p className="text-[10px] text-gray-600">Donationware — free forever</p>
          </div>
          <button onClick={onClose} className="btn-primary text-sm px-5 py-2">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }) {
  return (
    <div className="flex items-start gap-2.5">
      <svg className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
      </svg>
      <p className="text-xs text-gray-400 leading-relaxed">{text}</p>
    </div>
  );
}
