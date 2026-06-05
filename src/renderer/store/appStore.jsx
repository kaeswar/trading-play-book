import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentView, setCurrentView] = useState('planning'); // planning | verdict | gallery
  const [symbols, setSymbols] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [currentTradingDay, setCurrentTradingDay] = useState(null);
  const [notification, setNotification] = useState(null);
  const [saveDayPlanFn, setSaveDayPlanFn] = useState(null);
  const [savingDayPlan, setSavingDayPlan] = useState(false);
  const [refreshDatesFn, setRefreshDatesFn] = useState(null);
  const [showNoPlan, setShowNoPlan] = useState(false);
  const [language, setLanguageState] = useState(() => localStorage.getItem('tpb-language') || 'en');
  const [statusBarInfo, setStatusBarInfo] = useState(null);

  const setLanguage = (lang) => {
    localStorage.setItem('tpb-language', lang);
    setLanguageState(lang);
  };

  const [galleryFilters, setGalleryFilters] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    return { dateFrom: tomorrowStr };
  });

  const showNotification = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setNotification({ id, message, type });
    setTimeout(() => {
      setNotification((current) => (current && current.id === id ? null : current));
    }, 2000);
  }, []);

  const loadSymbols = useCallback(async () => {
    try {
      const allSymbols = await window.api.symbol.getActive();
      setSymbols(allSymbols);
      if (allSymbols.length > 0 && !selectedSymbol) {
        const nifty = allSymbols.find((s) => s.name.toLowerCase() === 'nifty');
        setSelectedSymbol(nifty || allSymbols[0]);
      }
    } catch (err) {
      console.error('Failed to load symbols:', err);
    }
  }, [selectedSymbol]);

  const value = {
    currentView,
    setCurrentView,
    symbols,
    setSymbols,
    selectedSymbol,
    setSelectedSymbol,
    selectedDate,
    setSelectedDate,
    currentTradingDay,
    setCurrentTradingDay,
    notification,
    showNotification,
    loadSymbols,
    saveDayPlanFn,
    setSaveDayPlanFn,
    savingDayPlan,
    setSavingDayPlan,
    refreshDatesFn,
    setRefreshDatesFn,
    showNoPlan,
    setShowNoPlan,
    galleryFilters,
    setGalleryFilters,
    language,
    setLanguage,
    statusBarInfo,
    setStatusBarInfo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
