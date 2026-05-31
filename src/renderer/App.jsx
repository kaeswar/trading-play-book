import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './store/appStore.jsx';
import { useLanguage } from './hooks/useLanguage';
import PlanningView from './components/Phase1/PlanningView';
import VerdictView from './components/Phase2/VerdictView';
import GalleryView from './components/Phase3/GalleryView';
import StockPlansView from './components/StockPlans/StockPlansView';
import StockPlanGallery from './components/StockPlans/StockPlanGallery';
import SettingsView from './components/Settings/SettingsView';
import IntradayReport from './components/Reports/IntradayReport';
import SwingReport from './components/Reports/SwingReport';
import AboutModal from './components/shared/AboutModal';
import UserGuideModal from './components/shared/UserGuideModal';
import StyledDatePicker from './components/shared/StyledDatePicker';

const SETTINGS_TREE = [
  {
    id: 'symbols',
    label: 'Symbols',
    icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z',
  },
  {
    id: 'dayPlan',
    label: 'Plan - Day Change',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'export',
    label: 'Export',
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  },
  {
    id: 'backup',
    label: 'Backup / Restore',
    icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
  },
];

const INTRADAY_NAV = [
  { id: 'planning',   labelKey: 'preMarket',  subKey: 'subCreateEdit',      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { id: 'verdict',    labelKey: 'postMarket', subKey: 'subUpdateResult',    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'gallery',    labelKey: 'gallery',    subKey: 'subViewDelete',      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
];

const SWING_NAV = [
  { id: 'swingPlans',   labelKey: 'swingPlans',   subKey: 'subCreateEditUpdate', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'swingGallery', labelKey: 'swingGallery', subKey: 'subViewDelete',      icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
];

const REPORTS_NAV = [
  { id: 'reportIntraday', labelKey: 'reportIntraday', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'reportSwing',    labelKey: 'reportSwing',    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
];

const PAGE_META = {
  planning:       { title: 'Pre-Market Planning',    sub: 'Document your trading expectations before market opens' },
  verdict:        { title: 'Post-Market Verdict',     sub: 'Record what actually happened after market close' },
  gallery:        { title: 'Gallery & Analysis',      sub: 'Review past trading days and analyse patterns' },
  swingPlans:     { title: 'Swing Plans',             sub: 'Active and open swing trade setups' },
  swingGallery:   { title: 'Swing Gallery',           sub: 'Search and review all swing trade plans' },
  settings:       { title: 'Settings',                sub: 'Manage and correct your trading plan data' },
  reportIntraday: { title: 'Intraday Report',         sub: 'Visual analysis of your daily trading performance' },
  reportSwing:    { title: 'Swing Report',            sub: 'Visual analysis of your swing trade execution' },
};

const INTRADAY_VIEWS = new Set(['planning', 'verdict', 'gallery']);

function NavButton({ item, currentView, onClick, t }) {
  const active = currentView === item.id;
  return (
    <button
      onClick={() => onClick(item.id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
          : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700'
      }`}
    >
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
      </svg>
      <div className="flex flex-col items-start">
        <span>{t(item.labelKey)}</span>
        {item.subKey && <span className="text-[10px] font-normal text-gray-500 leading-tight">{t(item.subKey)}</span>}
      </div>
    </button>
  );
}

function SectionLabel({ labelKey, t }) {
  return (
    <div className="px-3 pt-4 pb-1">
      <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{t(labelKey)}</span>
    </div>
  );
}

function AppContent() {
  const {
    currentView, setCurrentView, notification, loadSymbols,
    selectedSymbol, symbols, setSelectedSymbol,
    selectedDate, setSelectedDate,
    saveDayPlanFn, savingDayPlan, setRefreshDatesFn,
  } = useApp();
  const { t, language, setLanguage } = useLanguage();

  const [showAbout, setShowAbout] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    window.api.on('menu:open-about', () => setShowAbout(true));
    window.api.on('menu:open-guide', () => setShowGuide(true));
  }, []);
  const [availableDates, setAvailableDates] = useState([]);
  const [settingsSelected, setSettingsSelected] = useState('dayPlan');

  useEffect(() => { loadSymbols(); }, []);

  const fetchAvailableDates = () => {
    if (selectedSymbol) {
      window.api.tradingDay.getAvailableDates(selectedSymbol.id).then((dates) => {
        setAvailableDates(dates);
        if (currentView === 'verdict' && dates.length > 0 && !dates.includes(selectedDate)) {
          setSelectedDate(dates[0]);
        }
      });
    }
  };

  useEffect(() => { fetchAvailableDates(); }, [currentView, selectedSymbol]);

  useEffect(() => {
    setRefreshDatesFn(() => fetchAvailableDates);
    return () => setRefreshDatesFn(null);
  }, [selectedSymbol, currentView, selectedDate]);

  const isSettings = currentView === 'settings';
  const isIntraday = INTRADAY_VIEWS.has(currentView);
  const meta = PAGE_META[currentView] || {};

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-surface-800 border-r border-surface-600/50 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-surface-600/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-100">Trading Play Book</h1>
              <p className="text-xs text-gray-500">Plan Profile</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
          {/* Intraday group */}
          <SectionLabel labelKey="navIntraday" t={t} />
          {INTRADAY_NAV.map((item) => (
            <NavButton key={item.id} item={item} currentView={currentView} onClick={setCurrentView} t={t} />
          ))}

          {/* Swing group */}
          <SectionLabel labelKey="navSwing" t={t} />
          {SWING_NAV.map((item) => (
            <NavButton key={item.id} item={item} currentView={currentView} onClick={setCurrentView} t={t} />
          ))}

          {/* Reports */}
          <SectionLabel labelKey="navReports" t={t} />
          {REPORTS_NAV.map((item) => (
            <NavButton key={item.id} item={item} currentView={currentView} onClick={setCurrentView} t={t} />
          ))}

          {/* Settings */}
          <SectionLabel labelKey="navGeneral" t={t} />
          <div>
            <button
              onClick={() => setCurrentView('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isSettings
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t('settingsNav')}
            </button>

            {isSettings && (
              <div className="mt-1 ml-3 pl-3 border-l border-surface-600/40 space-y-0.5">
                {SETTINGS_TREE.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSettingsSelected(item.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
                      settingsSelected === item.id
                        ? 'text-primary-300 bg-primary-600/10'
                        : 'text-gray-500 hover:text-gray-200 hover:bg-surface-700/40'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0 text-primary-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-surface-600/50 space-y-2">
          {/* Language toggle */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{t('language')}</span>
            <div className="flex rounded-md overflow-hidden border border-surface-600/50">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-primary-600/30 text-primary-300'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-surface-700'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ta')}
                className={`px-2.5 py-1 text-[11px] font-medium transition-colors border-l border-surface-600/50 ${
                  language === 'ta'
                    ? 'bg-primary-600/30 text-primary-300'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-surface-700'
                }`}
              >
                தமிழ்
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowAbout(true)}
            className="w-full text-xs text-gray-500 hover:text-primary-400 transition-colors py-1"
          >
            About Trading Play Book
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-surface-900/80 backdrop-blur-md border-b border-surface-600/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="page-title">{meta.title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{meta.sub}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Symbol selector — intraday views only, lives in header */}
              {isIntraday && (
                <select
                  value={selectedSymbol?.id || ''}
                  onChange={(e) => {
                    const sym = symbols.find((s) => s.id === Number(e.target.value));
                    setSelectedSymbol(sym);
                  }}
                  className="input-field text-sm py-1.5 w-auto"
                >
                  {symbols.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}

              {/* Date picker — planning only */}
              {currentView === 'planning' && (
                <StyledDatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  highlightDates={availableDates}
                  placeholderText="Select date"
                />
              )}

              {/* Date dropdown — verdict only */}
              {currentView === 'verdict' && (
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field text-sm py-1.5 w-auto min-w-[150px]"
                >
                  {availableDates.length === 0 && <option value="">No trading days</option>}
                  {availableDates.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              )}

              {/* Save Day Plan button */}
              {currentView === 'planning' && saveDayPlanFn && (
                <button
                  onClick={saveDayPlanFn}
                  disabled={savingDayPlan}
                  className="btn-primary text-sm px-5 py-2 font-semibold"
                >
                  {savingDayPlan ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </span>
                  ) : 'Save Day Plan'}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* View content */}
        <div className="p-6">
          {currentView === 'planning'       && <PlanningView />}
          {currentView === 'verdict'        && <VerdictView />}
          {currentView === 'gallery'        && <GalleryView />}
          {currentView === 'swingPlans'     && <StockPlansView />}
          {currentView === 'swingGallery'   && <StockPlanGallery />}
          {isSettings                       && <SettingsView selected={settingsSelected} />}
          {currentView === 'reportIntraday' && <IntradayReport />}
          {currentView === 'reportSwing'    && <SwingReport />}
        </div>
      </main>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-6 py-3 rounded-lg shadow-lg border animate-slide-up ${
          notification.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
          notification.type === 'error'   ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                                            'bg-primary-500/20 border-primary-500/30 text-primary-400'
        }`}>
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showGuide && <UserGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
