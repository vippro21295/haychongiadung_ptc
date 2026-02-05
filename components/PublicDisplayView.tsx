
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, GameStatus, Submission } from '../types';
import { gameService } from '../services/gameService';
import { formatVND, formatTime } from './Formatters';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Trophy, Users, Star, Gift, TrendingUp, TrendingDown, 
  Award, BarChart3, CheckCircle, 
  Zap, Target, Clock, Monitor
} from 'lucide-react';

export const PublicDisplayView: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(gameService.getState());

  const refreshState = useCallback(() => {
    setGameState(gameService.getState());
  }, []);

  useEffect(() => {
    refreshState();
    window.addEventListener('storage', refreshState);
    return () => window.removeEventListener('storage', refreshState);
  }, [refreshState]);

  const playerUrl = window.location.origin + window.location.pathname;
  const primaryColor = gameState.options.primaryColor || '#2563eb';

  const stats = useMemo(() => {
    const subs = gameState.submissions;
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
              <p className="text-2xl text-slate-400 font-bold tracking-[0.2em] mb-10 italic uppercase">Đang chờ Admin bắt đầu lượt mới...</p>
              
              <div className="flex items-center gap-10 p-8 bg-white rounded-[40px] shadow-3xl relative z-10 scale-110">
                <QRCodeSVG value={playerUrl} size={240} level="H" includeMargin={true} />
                <div className="text-left border-l-4 pl-8 border-slate-200">
                   <p className="text-slate-900 font-black text-4xl uppercase tracking-tighter leading-none mb-2 italic">QUÉT MÃ<br/>ĐỂ CHƠI</p>
                   <p className="font-black text-sm tracking-[0.2em] uppercase opacity-60" style={{ color: primaryColor }}>Scan QR to Join</p>
                   <div className="mt-4 flex items-center gap-2 text-slate-400">
                      <Monitor className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Giao diện Realtime</span>
                   </div>
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
            {/* Cột trái: Sản phẩm & QR */}
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
                     <QRCodeSVG value={playerUrl} size={90} level="H" />
                   </div>
                   <div className="text-white min-w-0 flex flex-col justify-center">
                      <p className="text-xl font-black uppercase italic tracking-tighter leading-none mb-1">SCAN TO JOIN</p>
                      <p className="text-[10px] text-slate-300 font-bold leading-tight uppercase opacity-80 tracking-wide">
                        Sử dụng điện thoại<br/>để gửi dự đoán giá
                      </p>
                   </div>
                </div>

                <div className={`p-5 rounded-[30px] text-white flex flex-col items-center justify-center text-center shadow-lg transition-all duration-500 border-b-4 flex-1 ${isClosed ? 'bg-red-600 border-red-900' : ''}`} style={{ backgroundColor: isClosed ? undefined : primaryColor, borderColor: isClosed ? undefined : 'rgba(0,0,0,0.3)' }}>
                  {isClosed ? (
                    <>
                      <Zap className="w-8 h-8 mb-1 fill-white animate-pulse" />
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">LƯỢT ĐÃ ĐÓNG</h3>
                    </>
                  ) : (
                    <>
                      <Star className="w-8 h-8 mb-1 fill-white animate-spin-slow" />
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">ĐANG MỞ CỬA</h3>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Cột phải: Thống kê & Feed */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 h-full min-h-0">
              <div className="grid grid-cols-3 gap-6 shrink-0">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[35px] text-center shadow-lg">
                  <TrendingDown className="w-6 h-6 text-red-400 mx-auto mb-2" />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Giá thấp nhất</p>
                  <p className="text-2xl font-black text-white italic tracking-tighter">{stats ? formatVND(stats.minGuess) : '---'}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[35px] text-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Giá cao nhất</p>
                  <p className="text-2xl font-black text-white italic tracking-tighter">{stats ? formatVND(stats.maxGuess) : '---'}</p>
                </div>
                <div className="border-b-4 p-6 rounded-[35px] text-center shadow-xl relative overflow-hidden" style={{ backgroundColor: primaryColor, borderColor: 'rgba(0,0,0,0.2)' }}>
                  <Users className="w-8 h-8 text-white/30 mx-auto mb-1" />
                  <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">Tổng tham gia</p>
                  <p className="text-5xl font-black text-white tracking-tighter leading-none">{gameState.submissions.length}</p>
                </div>
              </div>

              <div className="flex-1 bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[40px] overflow-hidden flex flex-col min-h-0">
                <div className="px-8 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02] shrink-0">
                  <h3 className="text-xl font-black text-white uppercase italic flex items-center gap-3">
                    <BarChart3 className="w-6 h-6" style={{ color: primaryColor }} /> BẢNG GIÁ REALTIME
                  </h3>
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: primaryColor }}></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">LIVE DATA HUB</span>
                  </div>
                </div>
                
                <div className="flex-1 p-6 grid grid-cols-2 gap-8 min-h-0">
                   {/* Phổ biến */}
                   <div className="flex flex-col min-h-0">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-6 h-0.5 rounded-full" style={{ backgroundColor: primaryColor }}></span> XU HƯỚNG GIÁ
                      </p>
                      <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {stats?.sortedFreq.length === 0 ? (
                          <div className="h-full flex items-center justify-center border border-dashed border-white/5 rounded-3xl text-slate-700 italic font-bold">Waiting for input...</div>
                        ) : (
                          stats?.sortedFreq.map((item, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/[0.03] p-4 rounded-[20px] border border-white/5 hover:bg-white/[0.08] transition-all group">
                              <span className="font-black text-white text-2xl italic tracking-tighter leading-none group-hover:text-blue-400 transition-colors">{formatVND(item.price)}</span>
                              <div className="bg-white/10 text-white text-[9px] font-black px-3 py-1.5 rounded-xl border border-white/10 uppercase tracking-widest">{item.count} Lượt</div>
                            </div>
                          ))
                        )}
                      </div>
                   </div>

                   {/* Mới nhất */}
                   <div className="flex flex-col min-h-0">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-6 h-0.5 bg-slate-700 rounded-full"></span> LƯỢT GỬI MỚI
                      </p>
                      <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {[...gameState.submissions].reverse().slice(0, 10).map((sub, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/[0.02] p-3.5 rounded-[18px] border border-white/5 animate-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-inner">{sub.employeeId.charAt(0)}</div>
                              <div>
                                 <p className="font-black text-slate-200 text-sm uppercase tracking-tighter leading-none mb-1">{sub.employeeId}</p>
                                 <p className="text-[8px] text-slate-500 font-bold font-mono tracking-widest uppercase">{formatTime(sub.timestamp)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-green-400 px-2 py-1 bg-green-500/10 rounded-lg border border-green-500/20">
                               <CheckCircle className="w-2.5 h-2.5" />
                               <span className="text-[7px] font-black uppercase tracking-widest">OK</span>
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
            {/* Người thắng cuộc */}
            <div className="col-span-12 lg:col-span-5 flex flex-col h-full min-h-0">
              <div className="bg-yellow-500 flex-1 p-10 rounded-[50px] shadow-2xl border-[8px] border-yellow-300 relative overflow-hidden flex flex-col items-center justify-center text-center">
                <div className="absolute top-0 right-0 p-10 opacity-10 animate-spin-slow">
                   <Star className="w-64 h-64 text-white" />
                </div>
                <Trophy className="w-32 h-32 text-slate-900 mb-6 drop-shadow-xl animate-bounce relative z-10" />
                <h2 className="text-6xl font-black text-slate-950 uppercase italic tracking-tighter leading-none mb-8">WINNER!</h2>
                
                <div className="w-full bg-black/10 backdrop-blur-xl p-8 rounded-[35px] border border-white/20 mb-6">
                  <p className="text-slate-950/50 font-black uppercase text-[10px] mb-2 tracking-[0.4em]">MÃ NHÂN VIÊN</p>
                  <p className="text-7xl font-black text-slate-950 tracking-tighter leading-none">{gameState.winner?.employeeId}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full mb-6">
                   <div className="bg-white/20 p-4 rounded-3xl">
                      <p className="text-[9px] font-black text-slate-900/60 uppercase mb-1">GIÁ DỰ ĐOÁN</p>
                      <p className="text-3xl font-black text-slate-950 italic">{gameState.winner && formatVND(gameState.winner.guess)}</p>
                   </div>
                   <div className="bg-slate-900 p-4 rounded-3xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">GIÁ NIÊM YẾT</p>
                      <p className="text-3xl font-black text-yellow-400 italic">{gameState.prize && formatVND(gameState.prize.realPrice)}</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Bảng xếp hạng */}
            <div className="col-span-12 lg:col-span-7 flex flex-col h-full min-h-0">
               <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[50px] p-8 flex flex-col h-full shadow-2xl min-h-0">
                 <div className="flex items-center gap-4 mb-6 shrink-0">
                    <div className="p-3 rounded-2xl shadow-lg" style={{ backgroundColor: primaryColor }}>
                       <Award className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-1">TOP 10 DỰ ĐOÁN</h3>
                      <p className="text-[9px] text-slate-500 font-bold tracking-[0.4em] uppercase">BẢNG XẾP HẠNG CHÍNH XÁC NHẤT</p>
                    </div>
                 </div>

                 <div className="flex-1 grid grid-cols-2 gap-3 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                    {stats?.top10Closest.map((item, i) => (
                      <div key={i} className={`flex items-center justify-between p-5 rounded-[28px] border transition-all duration-300 ${i === 0 ? 'bg-yellow-500/15 border-yellow-500' : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'}`}>
                        <div className="flex items-center gap-4">
                          <span className={`text-3xl font-black italic w-10 text-center ${i === 0 ? 'text-yellow-500' : 'text-slate-700'}`}>{i + 1}</span>
                          <div>
                            <p className={`font-black uppercase text-lg tracking-tighter leading-none mb-1 ${i === 0 ? 'text-white' : 'text-slate-300'}`}>{item.sub.employeeId}</p>
                            <p className="text-[8px] font-black text-slate-500 tracking-widest uppercase italic">Lệch: {formatVND(item.diff)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                           <p className={`text-xl font-black italic leading-none ${i === 0 ? 'text-yellow-500' : 'text-blue-400'}`}>{formatVND(item.sub.guess)}</p>
                        </div>
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
    <div className="h-screen w-screen bg-[#020617] px-8 py-6 flex flex-col overflow-hidden font-sans relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[1000px] h-[1000px] opacity-[0.07] rounded-full blur-[250px] -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: primaryColor }}></div>
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] opacity-[0.07] rounded-full blur-[200px] translate-y-1/2 -translate-x-1/2" style={{ backgroundColor: primaryColor }}></div>
      </div>

      <header className="flex justify-between items-center mb-6 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[18px] flex items-center justify-center shadow-xl animate-pulse" style={{ backgroundColor: primaryColor }}>
            <Star className="w-6 h-6 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-0.5 drop-shadow-md">{gameState.options.eventName}</h1>
            <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-50 italic" style={{ color: primaryColor }}>{gameState.options.orgName}</p>
          </div>
        </div>
        
        {gameState.status !== GameStatus.IDLE && (
          <div className="bg-white/5 backdrop-blur-3xl px-6 py-2.5 rounded-[24px] border border-white/10 flex items-center gap-5 shadow-xl">
             <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 opacity-40 text-white" />
                <span className="text-white font-black text-xl uppercase tracking-tighter italic leading-none pt-1">
                  {new Date().toLocaleTimeString('vi-VN', { hour12: false, minute: '2-digit', hour: '2-digit'})}
                </span>
             </div>
             <div className="w-px h-6 bg-white/10"></div>
             <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 opacity-40 text-white" />
                <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-80" style={{ color: primaryColor }}>LIVE EVENT HUB</span>
             </div>
          </div>
        )}
      </header>

      <main className="flex-1 relative z-10 min-h-0">
        {renderStatus()}
      </main>

      <footer className="mt-4 flex justify-between items-center z-10 opacity-20 shrink-0">
        <div className="flex items-center gap-6">
          <p className="text-white font-black text-[8px] uppercase tracking-[0.6em]">REALTIME ENGINE 2.0</p>
          <div className="w-1 h-1 bg-white rounded-full"></div>
          <p className="text-white font-black text-[8px] uppercase tracking-[0.6em]">SECURE EVENT INFRA</p>
        </div>
        <p className="text-white font-black text-[8px] uppercase tracking-[0.6em]">POWERED BY AI-EVENT-TECH</p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${primaryColor}30; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${primaryColor}60; }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-bounce-subtle { animation: bounce-subtle 3s infinite ease-in-out; }
      `}} />
    </div>
  );
};
