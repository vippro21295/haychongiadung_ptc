
import React, { useState, useEffect } from 'react';
import { PlayerView } from './components/PlayerView';
import { AdminView } from './components/AdminView';
import { AnnouncerView } from './components/AnnouncerView';
import { PublicDisplayView } from './components/PublicDisplayView';
import { AppMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('PLAYER');

  useEffect(() => {
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
  }, []);

  const renderContent = () => {
    switch (mode) {
      case 'ADMIN': return <AdminView />;
      case 'ANNOUNCER': return <AnnouncerView />;
      case 'PUBLIC_DISPLAY': return <PublicDisplayView />;
      default: return <PlayerView />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderContent()}
      
      {/* Dev Navigation Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center p-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-2xl border border-white/50 ring-1 ring-black/5 overflow-x-auto max-w-[95vw]">
        <button 
          onClick={() => window.location.hash = ''}
          className={`whitespace-nowrap px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            mode === 'PLAYER' ? 'bg-slate-100 text-slate-800 shadow-inner' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Mobile User
        </button>
        <button 
          onClick={() => window.location.hash = 'announcer'}
          className={`whitespace-nowrap px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            mode === 'ANNOUNCER' ? 'bg-purple-100 text-purple-800 shadow-inner' : 'text-slate-400 hover:text-purple-600'
          }`}
        >
          Announcer
        </button>
        <button 
          onClick={() => window.location.hash = 'public'}
          className={`whitespace-nowrap px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            mode === 'PUBLIC_DISPLAY' ? 'bg-amber-100 text-amber-800 shadow-inner' : 'text-slate-400 hover:text-amber-600'
          }`}
        >
          Big Screen
        </button>
        <button 
          onClick={() => window.location.hash = 'admin'}
          className={`whitespace-nowrap px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            mode === 'ADMIN' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'
          }`}
        >
          Admin
        </button>
      </div>
    </div>
  );
};

export default App;
