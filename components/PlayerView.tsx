
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameStatus, PlayerScreen, Submission } from '../types';
import { gameService } from '../services/gameService';
import { formatVND, formatTime } from './Formatters';
import { CheckCircle, Trophy, Clock, User, DollarSign, Gift, Loader2, BellRing, AlertTriangle, CloudOff, PartyPopper, TimerOff } from 'lucide-react';

export const PlayerView: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(gameService.getState());
  const [screen, setScreen] = useState<PlayerScreen>('WAITING');
  const [employeeId, setEmployeeId] = useState('');
  const [guess, setGuess] = useState<string>('');
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCloudLoading, setIsCloudLoading] = useState(true);
  
  const deviceId = useRef(gameService.getDeviceId()).current;
  const lastStatus = useRef<GameStatus>(gameState.status);

  // LOGIC ĐIỀU PHỐI EVENT TỪ REALTIME DATABASE
  useEffect(() => {
    const unsubscribe = gameService.subscribeToState((newState) => {
      setIsCloudLoading(false);
      
      // Xử lý rung máy khi thắng (Chỉ bắn event nếu thiết bị trúng giải)
      if (lastStatus.current !== GameStatus.ANNOUNCED && newState.status === GameStatus.ANNOUNCED) {
        if (newState.winner && newState.winner.deviceId === deviceId) {
          if ('vibrate' in navigator) navigator.vibrate([300, 100, 300, 100, 500]);
        }
      }

      setGameState(newState);
      
      // Tìm thông tin của mình trên Database
      const foundMySub = (newState.submissions || []).find(s => s.deviceId === deviceId);
      setMySubmission(foundMySub || null);

      // --- LOGIC ĐIỀU PHỐI MÀN HÌNH THEO EVENT MC ---
      
      // 1. KHI ADMIN BẮM TIẾP TỤC LƯỢT MỚI (IDLE) -> RESET TẤT CẢ CLIENT VỀ WAITING
      if (newState.status === GameStatus.IDLE) {
        setScreen('WAITING');
        setGuess('');
        // Giữ lại EmployeeID đã nhập để tiện chơi tiếp
        if (foundMySub) setEmployeeId(foundMySub.employeeId);
      } 

      // 2. KHI ADMIN ĐÓNG LƯỢT (CLOSED / KHÓA GIÁ)
      else if (newState.status === GameStatus.CLOSED) {
        if (foundMySub && foundMySub.guess > 0) {
          // Client đã gửi giá: Giữ nguyên giao diện thành công
          setScreen('SUCCESS');
        } else {
          // Client chưa gửi giá: Chuyển sang màn hình TIMEOUT
          setScreen('TIMEOUT');
        }
      }

      // 3. KHI ADMIN CÔNG BỐ NGƯỜI THẮNG (ANNOUNCED)
      else if (newState.status === GameStatus.ANNOUNCED) {
        // Chỉ những ai đã gửi giá (đang ở SUCCESS) mới được xem kết quả thắng/thua
        if (foundMySub && foundMySub.guess > 0) {
          setScreen('RESULT');
        } 
        // Những ai ở TIMEOUT sẽ giữ nguyên màn hình TIMEOUT, không thấy chia buồn/chiến thắng
      }

      // 4. KHI ADMIN MỞ LƯỢT (OPEN)
      else if (newState.status === GameStatus.OPEN) {
        // Nếu đã submit giá rồi thì không cho nhập lại
        if (foundMySub && foundMySub.guess > 0) {
          setScreen('SUCCESS');
        }
      }

      lastStatus.current = newState.status;
    });

    return () => unsubscribe();
  }, [deviceId]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue === '') {
      setGuess('');
      return;
    }
    const formatted = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setGuess(formatted);
  };

  const handleLogin = async () => {
    const cleanId = employeeId.trim().toUpperCase();
    if (!cleanId) {
      setError('Vui lòng nhập mã nhân viên');
      return;
    }

    setIsSubmitting(true);
    setError('');

    // Kiểm tra mã nhân viên đã có người nào chiếm chưa
    const isIdTaken = (gameState.submissions || []).some(
      s => s.employeeId.toUpperCase() === cleanId && s.deviceId !== deviceId
    );

    if (isIdTaken) {
      setError(`Mã ${cleanId} đã có người sử dụng. Hãy kiểm tra lại!`);
      setIsSubmitting(false);
      return;
    }

    try {
      // Nếu là lần đầu hoặc thay đổi mã, tạo bản ghi "khóa mã" (guess = 0)
      if (!mySubmission || mySubmission.employeeId !== cleanId) {
        const newLockEntry: Submission = {
          employeeId: cleanId,
          guess: 0,
          timestamp: Date.now(),
          deviceId: deviceId
        };
        
        // Cập nhật submissions list
        let newSubs = [...(gameState.submissions || [])];
        const existingIdx = newSubs.findIndex(s => s.deviceId === deviceId);
        if (existingIdx >= 0) newSubs[existingIdx] = newLockEntry;
        else newSubs.push(newLockEntry);

        await gameService.saveState({
          ...gameState,
          submissions: newSubs
        });
      }
      setScreen('PRIZE_INFO');
    } catch (err) {
      setError('Lỗi kết nối Realtime.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPrice = async () => {
    // Nếu Admin đã khóa trong khi đang nhập
    if (gameState.status !== GameStatus.OPEN) {
      setScreen('TIMEOUT');
      return;
    }

    const numericGuess = parseInt(guess.replace(/\./g, ''));
    if (!numericGuess || numericGuess <= 0) {
      setError('Vui lòng nhập giá dự đoán hợp lệ');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedSubmissions = (gameState.submissions || []).map(s => 
        s.deviceId === deviceId ? { ...s, guess: numericGuess, timestamp: Date.now() } : s
      );
      
      await gameService.saveState({
        ...gameState,
        submissions: updatedSubmissions
      });
      setScreen('SUCCESS');
    } catch (err) {
      setError('Không thể gửi giá dự đoán.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderScreen = () => {
    if (isCloudLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500 font-bold italic">Kết nối Realtime...</p>
        </div>
      );
    }

    switch (screen) {
      case 'WAITING':
        return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 animate-in fade-in">
            <div className="bg-blue-100 p-6 rounded-full mb-8 animate-bounce-subtle shadow-xl shadow-blue-50">
              <Gift className="w-16 h-16 text-blue-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 mb-4 uppercase tracking-tighter italic leading-none">
              {gameState.options.eventName}<br/>
              <span className="text-blue-600 text-xl">REALTIME MODE</span>
            </h1>
            <p className="text-slate-500 mb-10 font-bold italic">Sẵn sàng để trở thành người thắng cuộc!</p>
            
            {gameState.status === GameStatus.OPEN ? (
              <button 
                onClick={() => setScreen('LOGIN')}
                className="w-full py-5 bg-blue-600 text-white rounded-[24px] text-xl font-black shadow-2xl shadow-blue-200 active:scale-95 transition-all uppercase italic tracking-tighter"
              >
                BẮT ĐẦU CHƠI
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4 bg-slate-50 p-8 rounded-[40px] border-2 border-slate-100 w-full">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest italic">MC đang chuẩn bị món quà...</p>
              </div>
            )}
          </div>
        );

      case 'LOGIN':
        return (
          <div className="p-8 animate-in slide-in-from-bottom-8">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase italic tracking-tighter">Định danh</h2>
              <p className="text-slate-500 text-sm font-bold italic">Nhập mã nhân viên của bạn để tham gia</p>
            </div>
            <div className="relative mb-6">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
              <input 
                type="text" 
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value.toUpperCase());
                  setError('');
                }}
                disabled={isSubmitting}
                placeholder="MÃ NHÂN VIÊN"
                className="w-full pl-14 pr-6 py-6 bg-white border-4 rounded-[28px] text-2xl font-black outline-none transition-all text-slate-950 border-slate-100 focus:border-blue-500 focus:bg-blue-50/20 placeholder:text-slate-200"
              />
            </div>
            {error && (
              <div className="flex items-center gap-3 text-red-600 mb-6 font-black bg-red-100 p-5 rounded-2xl border-2 border-red-200 animate-in shake-1">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <span className="text-sm italic uppercase tracking-tight">{error}</span>
              </div>
            )}
            <button 
              onClick={handleLogin}
              disabled={isSubmitting}
              className="w-full py-5 bg-slate-900 text-white rounded-[24px] text-xl font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 uppercase italic tracking-tighter"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'TIẾP TỤC'}
            </button>
          </div>
        );

      case 'PRIZE_INFO':
        return (
          <div className="p-6 animate-in fade-in">
            <div className="bg-white rounded-[50px] overflow-hidden shadow-2xl border-[6px] border-white mb-8">
              <img 
                src={gameState.prize?.imageUrl || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800'} 
                alt="Prize" 
                className="w-full h-72 object-cover"
              />
              <div className="p-10">
                <h3 className="text-3xl font-black text-blue-600 mb-2 uppercase italic tracking-tighter leading-none">{gameState.prize?.name}</h3>
                <p className="text-slate-500 font-bold text-sm mb-6 italic leading-relaxed">{gameState.prize?.description}</p>
                <div className="bg-emerald-50 p-5 rounded-2xl border-2 border-emerald-100 text-[10px] text-emerald-700 font-black uppercase tracking-widest flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <span>XÁC NHẬN: {employeeId}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setScreen('INPUT_PRICE')}
              className="w-full py-6 bg-blue-600 text-white rounded-[28px] text-xl font-black shadow-xl active:scale-95 transition-all uppercase italic tracking-tighter"
            >
              NHẬP GIÁ DỰ ĐOÁN
            </button>
          </div>
        );

      case 'INPUT_PRICE':
        return (
          <div className="p-10 animate-in slide-in-from-right-10">
             <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase italic tracking-tighter">Giá niêm yết?</h2>
              <p className="text-slate-500 text-sm font-bold italic">Dự đoán giá trị thật của món quà</p>
            </div>
            <div className="relative mb-10">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-4xl font-black text-slate-200">₫</span>
              <input 
                type="text" 
                inputMode="numeric"
                value={guess}
                onChange={handlePriceChange}
                disabled={isSubmitting}
                placeholder="0"
                className="w-full pl-16 pr-8 py-10 bg-white border-4 border-slate-100 rounded-[40px] text-5xl font-black focus:border-blue-600 focus:bg-blue-50/20 outline-none transition-all text-blue-600 placeholder:text-slate-100 shadow-inner"
              />
            </div>
            {error && <p className="text-red-500 mb-6 font-black bg-red-50 p-4 rounded-xl text-center text-xs italic uppercase">{error}</p>}
            <button 
              onClick={handleConfirmPrice}
              disabled={isSubmitting || !guess}
              className="w-full py-7 bg-blue-600 text-white rounded-[32px] text-2xl font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 uppercase italic tracking-tighter"
            >
              {isSubmitting ? <Loader2 className="w-8 h-8 animate-spin" /> : 'GỬI DỰ ĐOÁN'}
            </button>
          </div>
        );

      case 'SUCCESS':
        return (
          <div className="p-10 flex flex-col items-center text-center animate-in zoom-in">
            <div className="bg-emerald-100 p-10 rounded-full mb-12 mt-10 shadow-lg shadow-emerald-50">
              <CheckCircle className="w-24 h-24 text-emerald-600" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4 uppercase italic tracking-tighter">ĐÃ GỬI GIÁ!</h2>
            <p className="text-slate-400 mb-12 font-bold italic uppercase text-[10px] tracking-widest">Đang chờ MC công bố kết quả...</p>
            
            <div className="w-full bg-slate-950 p-10 rounded-[50px] text-left shadow-[0_25px_60px_rgba(0,0,0,0.4)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5 text-white"><DollarSign className="w-32 h-32" /></div>
              <div className="space-y-8 relative z-10">
                <div>
                  <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2 italic">Mã nhân viên</p>
                  <p className="text-white font-black text-3xl tracking-tight">{mySubmission?.employeeId}</p>
                </div>
                <div>
                  <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2 italic">Dự đoán của bạn</p>
                  <p className="text-white font-black text-5xl tracking-tighter">{mySubmission && formatVND(mySubmission.guess)}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'TIMEOUT':
        return (
          <div className="p-10 flex flex-col items-center text-center animate-in fade-in duration-500">
            <div className="bg-red-50 p-10 rounded-full mb-10 mt-10 border-2 border-red-100">
              <TimerOff className="w-24 h-24 text-red-500" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4 uppercase italic tracking-tighter leading-none">QUÁ HẠN!</h2>
            <p className="text-slate-500 mb-12 font-bold italic px-6 text-lg">
              Bạn chưa gửi giá dự đoán. <br/><span className="text-blue-600">Hãy tham gia ở lượt sau nhé!</span>
            </p>
            <div className="w-full bg-slate-50 border-4 border-dashed border-slate-200 p-10 rounded-[50px]">
               <Loader2 className="w-8 h-8 animate-spin text-slate-200 mx-auto mb-6" />
               <p className="text-slate-300 font-black uppercase text-xs tracking-[0.2em] italic">Chờ MC reset lượt quà mới...</p>
            </div>
          </div>
        );

      case 'RESULT':
        const isWinner = gameState.winner?.deviceId === deviceId;
        return (
          <div className="p-10 flex flex-col items-center text-center animate-in fade-in duration-1000">
             {isWinner ? (
               <div className="w-full">
                 <div className="bg-yellow-400 p-12 rounded-full mb-10 mt-10 animate-bounce mx-auto w-fit shadow-[0_30px_70px_rgba(250,204,21,0.6)]">
                    <PartyPopper className="w-28 h-28 text-slate-950" />
                 </div>
                 <h2 className="text-5xl font-black text-slate-950 mb-4 italic tracking-tighter uppercase leading-none">XUẤT SẮC!</h2>
                 <p className="text-2xl font-black text-blue-600 mb-12 uppercase italic tracking-tight">BẠN LÀ NGƯỜI CHIẾN THẮNG</p>
                 
                 <div className="bg-slate-950 p-12 rounded-[60px] shadow-2xl text-white border-[6px] border-yellow-400 relative">
                    <div className="absolute -top-6 -right-6 bg-yellow-400 p-4 rounded-3xl shadow-xl rotate-12"><Trophy className="w-10 h-10 text-slate-950" /></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-yellow-400 opacity-80">Giá niêm yết chính xác</p>
                    <p className="text-6xl font-black tracking-tighter text-yellow-400">
                      {gameState.prize && formatVND(gameState.prize.realPrice)}
                    </p>
                 </div>
                 <p className="mt-12 font-black text-slate-400 uppercase text-sm italic tracking-widest animate-pulse">Vui lòng lên nhận quà ngay!</p>
               </div>
             ) : (
               <div className="w-full">
                 <div className="bg-slate-50 p-12 rounded-full mb-12 mt-10 mx-auto w-fit border-2 border-slate-100">
                    <Gift className="w-24 h-24 text-slate-200" />
                 </div>
                 <h2 className="text-4xl font-black text-slate-400 mb-4 uppercase italic tracking-tighter leading-none">HẸN GẶP LẠI!</h2>
                 <p className="text-slate-500 mb-12 font-bold italic text-lg">Cảm ơn bạn đã tham dự lượt này.</p>
                 <div className="bg-white border-[6px] border-slate-50 p-12 rounded-[60px] text-slate-900 shadow-2xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-slate-400 italic">Giá niêm yết từ BTC</p>
                    <p className="text-5xl font-black tracking-tighter text-slate-950">{gameState.prize && formatVND(gameState.prize.realPrice)}</p>
                 </div>
               </div>
             )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl relative flex flex-col overflow-hidden">
      <header className="p-8 bg-white border-b border-slate-50 flex items-center justify-between sticky top-0 z-20">
        <span className="font-black text-2xl tracking-tighter text-blue-600 italic uppercase">
          {gameState.options.eventName}
        </span>
        <div className="flex items-center gap-4 bg-slate-950 px-5 py-2.5 rounded-[20px] text-[11px] font-black text-white uppercase tracking-widest shadow-xl">
           <div className={`w-2.5 h-2.5 rounded-full ${gameState.status === GameStatus.OPEN ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
           {gameState.status}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {renderScreen()}
      </main>
      <footer className="p-4 text-center opacity-5">
        <p className="text-[9px] font-bold uppercase tracking-widest">REALTIME ENGINE DB: {deviceId.substring(0, 8)}</p>
      </footer>
    </div>
  );
};
