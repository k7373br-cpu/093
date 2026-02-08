
import React, { useState, useCallback, useEffect } from 'react';
import { AppScreen, Asset, AssetType, Signal, UserStatus, SignalStatus, Language, Theme } from './types';
import Header from './components/Header';
import MainScreen from './components/MainScreen';
import AssetSelection from './components/AssetSelection';
import TimeframeSelection from './components/TimeframeSelection';
import AnalysisScreen from './components/AnalysisScreen';
import SignalResult from './components/SignalResult';
import EconomicCalendar from './components/EconomicCalendar';
import { TRANSLATIONS, ASSETS } from './constants';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.MAIN);
  const [lang, setLang] = useState<Language>('RU');
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('bt_theme');
    return (saved as Theme) || 'dark';
  });
  
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(null);
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);
  const [history, setHistory] = useState<Signal[]>([]);

  const [userStatus, setUserStatus] = useState<UserStatus>(() => {
    const saved = localStorage.getItem('bt_user_status');
    return (saved as UserStatus) || UserStatus.STANDARD;
  });

  const [signalsUsed, setSignalsUsed] = useState<number>(() => {
    const saved = localStorage.getItem('bt_signals_used');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [lastResetTime, setLastResetTime] = useState<number>(() => {
    const saved = localStorage.getItem('bt_last_reset');
    return saved ? parseInt(saved, 10) : Date.now();
  });

  const t = TRANSLATIONS[lang];
  const LIMIT = userStatus === UserStatus.VIP ? Infinity : (userStatus === UserStatus.ELITE ? 50 : 20);

  useEffect(() => {
    const root = document.body;
    if (theme === 'light') {
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
    }
    localStorage.setItem('bt_theme', theme);
  }, [theme]);

  useEffect(() => {
    const checkReset = () => {
      const now = Date.now();
      const resetInterval = 12 * 60 * 60 * 1000;
      if (now - lastResetTime >= resetInterval) {
        setSignalsUsed(0);
        setLastResetTime(now);
      }
    };
    checkReset();
    const interval = setInterval(checkReset, 60000);
    return () => clearInterval(interval);
  }, [lastResetTime]);

  useEffect(() => {
    localStorage.setItem('bt_user_status', userStatus);
    localStorage.setItem('bt_signals_used', signalsUsed.toString());
    localStorage.setItem('bt_last_reset', lastResetTime.toString());
  }, [userStatus, signalsUsed, lastResetTime]);

  const isForexClosed = useCallback(() => {
    const now = new Date();
    const day = now.getDay();
    // Пятница 00:00 - Понедельник 00:00 (5 - Пт, 6 - Сб, 0 - Вс)
    return day === 5 || day === 6 || day === 0;
  }, []);

  const handleAssetSelect = (asset: Asset) => {
    if (asset.type === AssetType.FOREX && isForexClosed()) return;
    
    if (signalsUsed >= LIMIT) {
      setScreen(AppScreen.MAIN);
      return;
    }
    setSelectedAsset(asset);
    setScreen(AppScreen.TIMEFRAME_SELECTION);
  };

  const handleBack = () => {
    switch (screen) {
      case AppScreen.RESULT:
      case AppScreen.ANALYSIS:
        setScreen(AppScreen.TIMEFRAME_SELECTION);
        break;
      case AppScreen.TIMEFRAME_SELECTION:
        setScreen(AppScreen.ASSET_SELECTION);
        break;
      case AppScreen.ASSET_SELECTION:
      case AppScreen.CALENDAR:
        setScreen(AppScreen.MAIN);
        break;
      default:
        setScreen(AppScreen.MAIN);
    }
  };

  const handleGoHome = () => {
    setScreen(AppScreen.MAIN);
    setSelectedAsset(null);
    setSelectedTimeframe(null);
  };

  const handleTimeframeSelect = (tf: string) => {
    setSelectedTimeframe(tf);
    setScreen(AppScreen.ANALYSIS);
  };

  const generateNewSignal = useCallback(() => {
    if (!selectedAsset || !selectedTimeframe) return;
    
    const direction = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const baseProb = 84;
    const variancy = Math.floor(Math.random() * 11);
    
    const signal: Signal = {
      id: `INF-${Math.floor(Math.random() * 90000) + 10000}`,
      asset: selectedAsset,
      timeframe: selectedTimeframe,
      direction: direction as 'BUY' | 'SELL',
      probability: baseProb + variancy,
      timestamp: Date.now(),
      status: 'PENDING'
    };
    
    if (signalsUsed === 0) setLastResetTime(Date.now());
    setSignalsUsed(prev => prev + 1);
    setCurrentSignal(signal);
    setHistory(prev => [signal, ...prev]);
  }, [selectedAsset, selectedTimeframe, signalsUsed]);

  const handleAnalysisComplete = useCallback(() => {
    generateNewSignal();
    setScreen(AppScreen.RESULT);
  }, [generateNewSignal]);

  const handleFeedback = (status: SignalStatus) => {
    if (!currentSignal) return;
    const updatedSignal = { ...currentSignal, status };
    setCurrentSignal(updatedSignal);
    setHistory(prev => prev.map(s => s.id === updatedSignal.id ? updatedSignal : s));
  };

  const handleUpgrade = (password: string) => {
    if (password === '2741520') {
      setUserStatus(UserStatus.ELITE);
      setSignalsUsed(0);
      setLastResetTime(Date.now());
      return true;
    }
    if (password === '1448135') {
      setUserStatus(UserStatus.VIP);
      return true;
    }
    return false;
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <div className="h-full bg-[var(--bg-deep)] text-[var(--text-main)] flex flex-col overflow-hidden transition-colors duration-400">
      <Header 
        lang={lang} 
        setLang={setLang} 
        onHome={handleGoHome} 
        onCalendar={() => setScreen(AppScreen.CALENDAR)} 
        theme={theme}
        onThemeToggle={toggleTheme}
      />
      <main className="flex-1 relative flex flex-col min-h-0">
        {screen === AppScreen.MAIN && (
          <MainScreen 
            onStart={() => setScreen(AppScreen.ASSET_SELECTION)} 
            onAssetSelect={handleAssetSelect}
            userStatus={userStatus} 
            onStatusToggle={() => {}}
            history={history}
            signalsUsed={signalsUsed}
            limit={LIMIT}
            t={t} 
            lang={lang} 
            onUpgrade={handleUpgrade}
            onResetElite={() => setSignalsUsed(0)}
          />
        )}
        {screen === AppScreen.ASSET_SELECTION && (
          <AssetSelection 
            assets={ASSETS} 
            onSelect={handleAssetSelect} 
            onBack={handleBack} 
            userStatus={userStatus} 
            t={t} 
          />
        )}
        {screen === AppScreen.TIMEFRAME_SELECTION && selectedAsset && (
          <TimeframeSelection 
            asset={selectedAsset} 
            onSelect={handleTimeframeSelect} 
            onBack={handleBack} 
            t={t} 
          />
        )}
        {screen === AppScreen.ANALYSIS && selectedAsset && selectedTimeframe && (
          <AnalysisScreen 
            asset={selectedAsset} 
            timeframe={selectedTimeframe} 
            onComplete={handleAnalysisComplete} 
            t={t} 
          />
        )}
        {screen === AppScreen.RESULT && currentSignal && (
          <SignalResult 
            signal={currentSignal} 
            onBack={handleBack} 
            onFeedback={handleFeedback}
            onNewCycle={generateNewSignal} 
            t={t} 
          />
        )}
        {screen === AppScreen.CALENDAR && (
          <EconomicCalendar 
            lang={lang} 
            onBack={handleBack} 
            t={t} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
