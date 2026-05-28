import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './store/appStore.jsx';
import PlanningView from './components/Phase1/PlanningView';
import VerdictView from './components/Phase2/VerdictView';
import GalleryView from './components/Phase3/GalleryView';
import StockPlansView from './components/StockPlans/StockPlansView';
import AboutModal from './components/shared/AboutModal';
import StyledDatePicker from './components/shared/StyledDatePicker';

function AppContent() {
  const { currentView, setCurrentView, notification, loadSymbols, selectedSymbol, symbols, setSelectedSymbol, selectedDate, setSelectedDate, saveDayPlanFn, savingDayPlan, setRefreshDatesFn } = useApp();
  const [showAbout, setShowAbout] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);

  useEffect(() => {
    loadSymbols();
  }, []);

  // Fetch available dates for both planning and verdict views
  const fetchAvailableDates = () => {
    if (selectedSymbol) {
      window.api.tradingDay.getAvailableDates(selectedSymbol.id).then((dates) => {
        setAvailableDates(dates);
        // For verdict view, auto-select first available date if current not in list
        if (currentView === 'verdict' && dates.length > 0 && !dates.includes(selectedDate)) {
          setSelectedDate(dates[0]);
        }
      });
    }
  };

  useEffect(() => {
    fetchAvailableDates();
  }, [currentView, selectedSymbol]);

  // Register refresh function so PlanningView can call it after creating a day
  useEffect(() => {
    setRefreshDatesFn(() => fetchAvailableDates);
    return () => setRefreshDatesFn(null);
  }, [selectedSymbol, currentView, selectedDate]);

  const navItems = [
    { id: 'planning', label: 'Pre-Market Plan', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { id: 'verdict', label: 'Post-Market', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'gallery', label: 'Gallery', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id: 'stockPlans', label: 'Stock Plans', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      {/* Sidebar */}
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

        {/* Symbol Selector - hidden in Stock Plans view */}
        {currentView !== 'stockPlans' && (
          <div className="p-4 border-b border-surface-600/50">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Symbol</label>
            <select
              value={selectedSymbol?.id || ''}
              onChange={(e) => {
                const sym = symbols.find((s) => s.id === Number(e.target.value));
                setSelectedSymbol(sym);
              }}
              className="input-field text-sm"
            >
              {symbols.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentView === item.id
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-surface-600/50">
          <button
            onClick={() => setShowAbout(true)}
            className="w-full text-xs text-gray-500 hover:text-primary-400 transition-colors py-1"
          >
            About Trading Play Book
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <header className="sticky top-0 z-10 bg-surface-900/80 backdrop-blur-md border-b border-surface-600/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="page-title">
                {currentView === 'planning' && 'Pre-Market Planning'}
                {currentView === 'verdict' && 'Post-Market Verdict'}
                {currentView === 'gallery' && 'Gallery & Analysis'}
                {currentView === 'stockPlans' && 'Stock Swing Plans'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {currentView === 'planning' && 'Document your trading expectations before market opens'}
                {currentView === 'verdict' && 'Record what actually happened after market close'}
                {currentView === 'gallery' && 'Review past trading days and analyse patterns'}
                {currentView === 'stockPlans' && 'Plan and track stock swing trades over 3-6 months'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {currentView === 'planning' && (
                <StyledDatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  highlightDates={availableDates}
                  placeholderText="Select date"
                />
              )}
              {currentView === 'verdict' && (
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field text-sm py-1.5 w-auto min-w-[150px]"
                >
                  {availableDates.length === 0 && (
                    <option value="">No trading days</option>
                  )}
                  {availableDates.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              )}
              {currentView === 'planning' && saveDayPlanFn && (
                <button
                  onClick={saveDayPlanFn}
                  disabled={savingDayPlan}
                  className="btn-primary text-sm px-5 py-2 font-semibold"
                >
                  {savingDayPlan ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save Day Plan'
                  )}
                </button>
              )}
              {selectedSymbol && currentView !== 'stockPlans' && (
                <span className="badge bg-primary-500/20 text-primary-400 border border-primary-500/30">
                  {selectedSymbol.name}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="p-6">
          {currentView === 'planning' && <PlanningView />}
          {currentView === 'verdict' && <VerdictView />}
          {currentView === 'gallery' && <GalleryView />}
          {currentView === 'stockPlans' && <StockPlansView />}
        </div>
      </main>

      {/* Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border animate-slide-up ${
          notification.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
          notification.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
          'bg-primary-500/20 border-primary-500/30 text-primary-400'
        }`}>
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      {/* About Modal */}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
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
