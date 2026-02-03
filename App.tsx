
import React, { useState, useEffect } from 'react';
import { PlayerView } from './components/PlayerView';
import { AdminView } from './components/AdminView';
import { AnnouncerView } from './components/AnnouncerView';
import { PublicDisplayView } from './components/PublicDisplayView';
import { AppMode } from './types';
import { gameService } from './services/gameService';
import { AlertCircle, CloudCheck, CheckCircle2, Cloud } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('PLAYER');
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    gameService.onError((err) => setCloudError(err));
    gameService.onConnected(() => {
      if (cloudError) {
        setCloudError(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    });

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#admin')) {
        setMode('ADMIN');
      } else if (hash.startsWith('#announcer')) {
        setMode('ANNOUNCER');
      } else if (hash.startsWith('#public')) {
        setMode('PUBLIC_DISPLAY');
      } else {
        setMode('PLAYER');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [cloudError]);

  const renderContent = () => {
    switch (mode) {
      case 'ADMIN': return <AdminView />;
      case 'ANNOUNCER': return <AnnouncerView />;
      case 'PUBLIC_DISPLAY': return <PublicDisplayView />;
      default: return <PlayerView />;
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Error Banner */}
      {cloudError && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-red-600 text-white p-4 flex items-center justify-center gap-3 text-sm font-bold shadow-2xl animate-in slide-in-from-top-full">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <span className="flex-1 text-center">{cloudError}</span>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all text-xs uppercase tracking-widest"
          >
            Nạp lại trang
          </button>
        </div>
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-emerald-500 text-white px-6 py-4 rounded-3xl flex items-center gap-3 shadow-2xl animate-in zoom-in slide-in-from-top-4">
          <CheckCircle2 className="w-6 h-6" />
          <p className="font-bold">Đã đồng bộ Cloud thành công!</p>
        </div>
      )}

      {renderContent()}
      
      {/* Dev Navigation Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center p-1.5 bg-white/90 backdrop-blur-xl rounded-full shadow-2xl border border-white/50 ring-1 ring-black/5 overflow-x-auto max-w-[95vw] sm:max-w-none">
        <button 
          onClick={() => window.location.hash = ''}
          className={`whitespace-nowrap px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            mode === 'PLAYER' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Người chơi
        </button>
        <button 
          onClick={() => window.location.hash = 'announcer'}
          className={`whitespace-nowrap px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            mode === 'ANNOUNCER' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-purple-600'
          }`}
        >
          MC/Announcer
        </button>
        <button 
          onClick={() => window.location.hash = 'public'}
          className={`whitespace-nowrap px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            mode === 'PUBLIC_DISPLAY' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-amber-600'
          }`}
        >
          Màn hình lớn
        </button>
        <button 
          onClick={() => window.location.hash = 'admin'}
          className={`whitespace-nowrap px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            mode === 'ADMIN' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'
          }`}
        >
          Quản trị
        </button>
      </div>
    </div>
  );
};

export default App;
