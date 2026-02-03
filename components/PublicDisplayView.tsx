
import React, { useState, useEffect, useMemo } from 'react';
import { GameState, GameStatus, Submission } from '../types';
import { gameService } from '../services/gameService';
import { formatVND, formatTime } from './Formatters';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Trophy, Users, Star, Gift, TrendingUp, TrendingDown, 
  Target, Clock, BarChart3, CheckCircle
} from 'lucide-react';

export const PublicDisplayView: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(gameService.getState());
  const [playerUrl, setPlayerUrl] = useState<string>('');

  useEffect(() => {
    const unsubscribe = gameService.subscribeToState((newState) => {
      setGameState(newState);
    });
    
    const currentUrl = window.location.origin + window.location.pathname;
    setPlayerUrl(currentUrl);
    
    return () => unsubscribe();
  }, []);

  const primaryColor = gameState.options.primaryColor || '#2563eb';

  const stats = useMemo(() => {
    const subs = gameState.submissions || [];
    if (subs.length === 0) return null;

    const prices = subs.map(s => s.guess);
    const minGuess = Math.min(...prices);
    const maxGuess = Math.max(...prices);
    
    const frequency: Record<number, number> = {};
    subs.forEach(s => {
      frequency[s.guess] = (frequency[s.guess] || 0) + 1;
    });
    
    const sortedFreq = Object.entries(frequency)
      .map(([price, count]) => ({ price: parseInt(price), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    let top10Closest: { sub: Submission, diff: number }[] = [];
    if (gameState.prize) {
      const realPrice = gameState.prize.realPrice;
      top10Closest = subs
        .map(s => ({ sub: s, diff: Math.abs(s.guess - realPrice) }))
        .sort((a, b) => {
          if (a.diff !== b.diff) return a.diff - b.diff;
          return a.sub.timestamp - b.sub.timestamp;
        })
        .slice(0, 10);
    }

    return { minGuess, maxGuess, sortedFreq, top10Closest };
  }, [gameState.submissions, gameState.prize]);

  const renderStatus = () => {
    switch (gameState.status) {
      case GameStatus.IDLE:
        return (
          <div className="flex flex-col items-center justify-center flex-1 animate-in fade-in zoom-in duration-700 h-full">
            <div className="bg-white/5 backdrop-blur-3xl p-12 rounded-[60px] border border-white/10 flex flex-col items-center text-center max-w-4xl shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-5" style={{ backgroundColor: primaryColor }}></div>
              <Gift className="w-32 h-32 mb-6 relative z-10 animate-bounce-subtle" style={{ color: primaryColor }} />
              <h2 className="text-7xl font-black uppercase italic tracking-tighter text-white leading-none mb-4">MỜI THAM GIA</h2>
              <p className="text-2xl text-slate-400 font-bold tracking-[0.2em] mb-10 italic uppercase">BTC ĐANG CHUẨN BỊ QUÀ...</p>
              
              <div className="flex items-center gap-10 p-8 bg-white rounded-[40px] shadow-3xl relative z-10 scale-110">
                {playerUrl && <QRCodeSVG value={playerUrl} size={240} level="H" includeMargin={true} />}
                <div className="text-left border-l-4 pl-8 border-slate-200">
                   <p className="text-slate-900 font-black text-4xl uppercase tracking-tighter leading-none mb-2 italic">QUÉT MÃ<br/>ĐỂ CHƠI</p>
                   <p className="font-black text-sm tracking-[0.2em] uppercase opacity-60" style={{ color: primaryColor }}>Scan to Join Live</p>
                </div>
              </div>
            </div>
          </div>
        );

      case GameStatus.OPEN:
      case GameStatus.CLOSED:
        const isClosed = gameState.status === GameStatus.CLOSED;
        return (
          <div className="grid grid-cols-12 gap-6 w-full h-full animate-in zoom-in duration-500 overflow-hidden">
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full min-h-0">
              <div className="bg-white rounded-[40px] overflow-hidden shadow-xl border-4 border-white aspect-square relative group shrink-0">
                <img 
                  src={gameState.prize?.imageUrl || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800'} 
                  className="w-full h-full object-cover"
                  alt="Prize"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6">
                   <p className="font-black uppercase text-[10px] tracking-[0.4em] mb-2 flex items-center gap-2" style={{ color: primaryColor }}>
                     <Target className="w-3 h-3" /> THÔNG TIN QUÀ TẶNG
                   </p>
                   <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-tight">{gameState.prize?.name}</h2>
                </div>
              </div>
              
              <div className="flex-1 bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-6 rounded-[40px] flex flex-col gap-4 min-h-0">
                <div className="flex gap-4 items-center bg-white/5 p-4 rounded-[30px] border border-white/10 flex-1">
                   <div className="bg-white p-2 rounded-2xl shrink-0 shadow-lg flex items-center justify-center">
                     {playerUrl && <QRCodeSVG value={playerUrl} size={90} level="H" includeMargin={false} />}
                   </div>
                   <div className="text-white min-w-0 flex flex-col justify-center">
                      <p className="text-xl font-black uppercase italic tracking-tighter leading-none mb-1">QUÉT ĐỂ CHƠI</p>
                      <p className="text-[10px] text-slate-300 font-bold leading-tight uppercase opacity-80 tracking-wide">Cloud Realtime Sync</p>
                   </div>
                </div>

                <div className={`p-5 rounded-[30px] text-white flex flex-col items-center justify-center text-center shadow-lg transition-all duration-500 flex-1 ${isClosed ? 'bg-red-600' : ''}`} style={{ backgroundColor: isClosed ? undefined : primaryColor }}>
                  {isClosed ? (
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">LƯỢT ĐÃ ĐÓNG</h3>
                  ) : (
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">ĐANG NHẬN GIÁ</h3>
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 h-full min-h-0">
              <div className="grid grid-cols-3 gap-6 shrink-0">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[35px] text-center shadow-lg flex flex-col justify-center">
                  <TrendingDown className="w-6 h-6 text-red-400 mx-auto mb-2" />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Thấp nhất</p>
                  <p className="text-2xl font-black text-white italic tracking-tighter">{stats ? formatVND(stats.minGuess) : '---'}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[35px] text-center shadow-lg flex flex-col justify-center">
                  <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Cao nhất</p>
                  <p className="text-2xl font-black text-white italic tracking-tighter">{stats ? formatVND(stats.maxGuess) : '---'}</p>
                </div>
                {/* Khôi phục khối Tổng tham gia về đơn giản */}
                <div 
                  className="p-6 rounded-[35px] text-center shadow-xl flex flex-col justify-center transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Users className="w-8 h-8 text-white/30 mx-auto mb-1" />
                  <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">Tổng tham gia</p>
                  <p className="text-5xl font-black text-white tracking-tighter leading-none">{gameState.submissions.length}</p>
                </div>
              </div>

              <div className="flex-1 bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[40px] overflow-hidden flex flex-col min-h-0">
                <div className="px-8 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                  <h3 className="text-xl font-black text-white uppercase italic flex items-center gap-3">
                    <BarChart3 className="w-6 h-6" style={{ color: primaryColor }} /> DỮ LIỆU ĐANG ĐỔ VỀ
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                    <span className="text-[10px] font-black text-emerald-500 uppercase">Live Sync Active</span>
                  </div>
                </div>
                
                <div className="flex-1 p-6 grid grid-cols-2 gap-8 min-h-0">
                   <div className="flex flex-col min-h-0">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">XU HƯỚNG GIÁ PHỔ BIẾN</p>
                      <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                        {stats?.sortedFreq.length === 0 ? (
                           <div className="flex-1 flex items-center justify-center text-slate-600 italic text-sm">Chưa có dữ liệu xu hướng</div>
                        ) : stats?.sortedFreq.map((item, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/[0.03] p-4 rounded-[20px] border border-white/5">
                            <span className="font-black text-white text-2xl italic tracking-tighter">{formatVND(item.price)}</span>
                            <div className="bg-white/10 text-white text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest">{item.count} lượt</div>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="flex flex-col min-h-0">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">NHẬT KÝ DỰ ĐOÁN MỚI NHẤT</p>
                      <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                        {gameState.submissions.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-slate-600 italic text-sm">Đang chờ lượt chơi đầu tiên...</div>
                        ) : [...gameState.submissions].reverse().slice(0, 10).map((sub, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/[0.02] p-3.5 rounded-[18px] border border-white/5 animate-in slide-in-from-right-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-xs font-black text-white">{sub.employeeId.charAt(0)}</div>
                              <div>
                                 <p className="font-black text-slate-200 text-sm uppercase tracking-tighter leading-none mb-1">{sub.employeeId}</p>
                                 <p className="text-[8px] text-slate-500 font-bold uppercase">{formatTime(sub.timestamp)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <span className="text-xs font-black text-slate-400 italic">{formatVND(sub.guess)}</span>
                               <CheckCircle className="w-4 h-4 text-green-500/50" />
                            </div>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        );

      case GameStatus.ANNOUNCED:
        return (
          <div className="grid grid-cols-12 gap-8 w-full h-full animate-in slide-in-from-bottom-12 duration-700 overflow-hidden">
            <div className="col-span-12 lg:col-span-5 flex flex-col h-full">
              <div className="bg-yellow-500 flex-1 p-10 rounded-[50px] shadow-2xl border-[8px] border-yellow-300 relative overflow-hidden flex flex-col items-center justify-center text-center">
                <Trophy className="w-32 h-32 text-slate-900 mb-6 animate-bounce" />
                <h2 className="text-6xl font-black text-slate-950 uppercase italic tracking-tighter leading-none mb-8">WINNER!</h2>
                <div className="w-full bg-black/10 backdrop-blur-xl p-8 rounded-[35px] mb-6">
                  <p className="text-slate-950/50 font-black uppercase text-[10px] mb-2 tracking-[0.4em]">NHÂN VIÊN THẮNG CUỘC</p>
                  <p className="text-7xl font-black text-slate-950 tracking-tighter leading-none">{gameState.winner?.employeeId}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                   <div className="bg-white/20 p-4 rounded-3xl">
                      <p className="text-[9px] font-black text-slate-900/60 uppercase mb-1">DỰ ĐOÁN</p>
                      <p className="text-3xl font-black text-slate-950 italic">{gameState.winner && formatVND(gameState.winner.guess)}</p>
                   </div>
                   <div className="bg-slate-900 p-4 rounded-3xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">GIÁ ĐÚNG</p>
                      <p className="text-3xl font-black text-yellow-400 italic">{gameState.prize && formatVND(gameState.prize.realPrice)}</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-7 flex flex-col h-full">
               <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[50px] p-8 flex flex-col h-full shadow-2xl overflow-hidden">
                 <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-6">BẢNG XẾP HẠNG TOP 10</h3>
                 <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                    {stats?.top10Closest.map((item, i) => (
                      <div key={i} className={`flex items-center justify-between p-5 rounded-[28px] border transition-all ${i === 0 ? 'bg-yellow-500/15 border-yellow-500' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex items-center gap-4">
                          <span className={`text-3xl font-black italic w-10 text-center ${i === 0 ? 'text-yellow-500' : 'text-slate-700'}`}>{i + 1}</span>
                          <div>
                            <p className="font-black uppercase text-lg text-white leading-none mb-1">{item.sub.employeeId}</p>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Lệch: {formatVND(item.diff)}</p>
                          </div>
                        </div>
                        <p className={`text-xl font-black italic ${i === 0 ? 'text-yellow-500' : 'text-blue-400'}`}>{formatVND(item.sub.guess)}</p>
                      </div>
                    ))}
                 </div>
               </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-screen bg-[#020617] px-8 py-6 flex flex-col overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] opacity-[0.05] rounded-full blur-[200px]" style={{ backgroundColor: primaryColor }}></div>
      </div>

      <header className="flex justify-between items-center mb-6 z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[18px] flex items-center justify-center shadow-xl animate-pulse" style={{ backgroundColor: primaryColor }}>
            <Star className="w-6 h-6 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">{gameState.options.eventName}</h1>
            <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-50" style={{ color: primaryColor }}>{gameState.options.orgName}</p>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-3xl px-6 py-2.5 rounded-[24px] border border-white/10 flex items-center gap-4">
           <Clock className="w-4 h-4 opacity-40 text-white" />
           <span className="text-white font-black text-xl uppercase italic tracking-tighter">
             {new Date().toLocaleTimeString('vi-VN', { hour12: false, minute: '2-digit', hour: '2-digit'})}
           </span>
        </div>
      </header>

      <main className="flex-1 relative z-10 min-h-0">{renderStatus()}</main>

      <footer className="mt-4 flex justify-between items-center z-10 opacity-20">
        <p className="text-white font-black text-[8px] uppercase tracking-[0.6em]">FIREBASE REALTIME ENGINE 10.8.0</p>
        <p className="text-white font-black text-[8px] uppercase tracking-[0.6em]">POWERED BY AI-EVENT-TECH</p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${primaryColor}30; border-radius: 10px; }
      `}} />
    </div>
  );
};
