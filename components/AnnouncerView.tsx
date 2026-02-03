
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, GameStatus } from '../types';
import { gameService } from '../services/gameService';
import { Play, Square, Trophy, Mic2, RefreshCw, AlertCircle } from 'lucide-react';

export const AnnouncerView: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(gameService.getState());

  const refreshState = useCallback(() => {
    setGameState(gameService.getState());
  }, []);

  useEffect(() => {
    refreshState();
    window.addEventListener('storage', refreshState);
    return () => window.removeEventListener('storage', refreshState);
  }, [refreshState]);

  const handleOpenRound = () => {
    if (!gameState.prize) {
      alert("Admin chưa thiết lập món quà!");
      return;
    }
    gameService.saveState({ ...gameState, status: GameStatus.OPEN });
  };

  const handleCloseRound = () => {
    gameService.saveState({ ...gameState, status: GameStatus.CLOSED });
  };

  const handleAnnounce = () => {
    const winner = gameService.calculateWinner(gameState);
    gameService.saveState({ ...gameState, status: GameStatus.ANNOUNCED, winner });
  };

  const handleNextRound = () => {
    if (confirm("Chuyển sang lượt quà tiếp theo?")) {
      gameService.prepareNewRound();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 flex flex-col items-center justify-center">
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 font-black text-xs uppercase tracking-widest mb-4">
          <Mic2 className="w-4 h-4" /> Bảng điều khiển MC
        </div>
        <h1 className="text-4xl font-black uppercase italic tracking-tighter">Công bố kết quả</h1>
      </div>

      <div className="w-full max-w-lg space-y-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] shadow-2xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Trạng thái hiện tại</p>
          <div className="flex items-center gap-4 mb-8">
            <span className={`px-6 py-2 rounded-2xl text-xl font-black uppercase tracking-tighter border-2 ${
              gameState.status === GameStatus.OPEN ? 'bg-green-500/10 border-green-500 text-green-500' :
              gameState.status === GameStatus.ANNOUNCED ? 'bg-purple-500/10 border-purple-500 text-purple-500' :
              'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              {gameState.status}
            </span>
            <div className="flex-1">
              <p className="font-bold text-slate-200">{gameState.prize?.name || 'Chưa chọn quà'}</p>
              <p className="text-xs text-slate-500 font-bold">{gameState.submissions.length} người đang tham gia</p>
            </div>
          </div>

          <div className="space-y-4">
            {gameState.status === GameStatus.IDLE && (
              <button 
                onClick={handleOpenRound}
                className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[24px] font-black text-2xl uppercase italic tracking-tighter shadow-xl shadow-blue-900/40 flex items-center justify-center gap-4 transition-all"
              >
                <Play className="w-8 h-8 fill-current" /> Bắt đầu lượt
              </button>
            )}

            {gameState.status === GameStatus.OPEN && (
              <button 
                onClick={handleCloseRound}
                className="w-full py-6 bg-red-600 hover:bg-red-500 text-white rounded-[24px] font-black text-2xl uppercase italic tracking-tighter shadow-xl shadow-red-900/40 flex items-center justify-center gap-4 transition-all"
              >
                <Square className="w-8 h-8 fill-current" /> Dừng lượt
              </button>
            )}

            {gameState.status === GameStatus.CLOSED && (
              <button 
                onClick={handleAnnounce}
                className="w-full py-6 bg-purple-600 hover:bg-purple-500 text-white rounded-[24px] font-black text-2xl uppercase italic tracking-tighter shadow-xl shadow-purple-900/40 flex items-center justify-center gap-4 transition-all"
              >
                <Trophy className="w-8 h-8" /> Công bố người thắng
              </button>
            )}

            {gameState.status === GameStatus.ANNOUNCED && (
              <button 
                onClick={handleNextRound}
                className="w-full py-6 bg-slate-800 hover:bg-slate-700 text-white rounded-[24px] font-black text-2xl uppercase italic tracking-tighter shadow-xl flex items-center justify-center gap-4 transition-all"
              >
                <RefreshCw className="w-8 h-8" /> Lượt tiếp theo
              </button>
            )}
          </div>
        </div>

        {!gameState.prize && (
          <div className="flex items-center gap-4 p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl text-amber-500">
            <AlertCircle className="w-8 h-8 shrink-0" />
            <p className="font-bold leading-tight">Vui lòng chờ Admin thiết lập thông tin món quà trước khi bắt đầu.</p>
          </div>
        )}
      </div>
    </div>
  );
};
