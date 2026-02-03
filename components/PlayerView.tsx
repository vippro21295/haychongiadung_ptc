
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

  // LOGIC ĐIỀU PHỐI EVENT TỪ CLOUD
  useEffect(() => {
    const unsubscribe = gameService.subscribeToState((newState) => {
      setIsCloudLoading(false);
      
      // Xử lý rung máy khi thắng
      if (lastStatus.current !== GameStatus.ANNOUNCED && newState.status === GameStatus.ANNOUNCED) {
        if (newState.winner && newState.winner.deviceId === deviceId) {
          if ('vibrate' in navigator) navigator.vibrate([300, 100, 300, 100, 500]);
        }
      }

      setGameState(newState);
      
      // Tìm thông tin của mình trên Cloud
      const foundMySub = (newState.submissions || []).find(s => s.deviceId === deviceId);
      setMySubmission(foundMySub || null);

      // --- LOGIC ĐIỀU PHỐI MÀN HÌNH ---
      
      // 1. KHI ADMIN RESET LƯỢT MỚI (IDLE)
      if (newState.status === GameStatus.IDLE) {
        setScreen('WAITING');
        setGuess('');
        // Giữ lại EmployeeID nếu đã từng nhập để tiện cho lượt sau
        if (foundMySub) setEmployeeId(foundMySub.employeeId);
      } 

      // 2. KHI ADMIN ĐÓNG LƯỢT (CLOSED)
      else if (newState.status === GameStatus.CLOSED) {
        // Kiểm tra xem đã gửi giá chưa
        if (foundMySub && foundMySub.guess > 0) {
          // Đã gửi giá -> Giữ ở SUCCESS
          setScreen('SUCCESS');
        } else {
          // Chưa gửi giá -> Chuyển sang TIMEOUT
          setScreen('TIMEOUT');
        }
      }

      // 3. KHI ADMIN CÔNG BỐ (ANNOUNCED)
      else if (newState.status === GameStatus.ANNOUNCED) {
        // Chỉ chuyển sang RESULT nếu đã tham gia gửi giá
        if (foundMySub && foundMySub.guess > 0) {
          setScreen('RESULT');
        } 
        // Nếu đang ở TIMEOUT hoặc chưa tham gia thì không bắn event kết quả thắng/thua
      }

      // 4. KHI ADMIN ĐANG MỞ (OPEN)
      else if (newState.status === GameStatus.OPEN) {
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

    // Kiểm tra mã nhân viên đã có người dùng chưa (Chống trùng realtime)
    const isIdTaken = (gameState.submissions || []).some(
      s => s.employeeId.toUpperCase() === cleanId && s.deviceId !== deviceId
    );

    if (isIdTaken) {
      setError(`Mã ${cleanId} đã được đăng ký bởi thiết bị khác!`);
      setIsSubmitting(false);
      return;
    }

    try {
      if (!mySubmission) {
        const newLockEntry: Submission = {
          employeeId: cleanId,
          guess: 0,
          timestamp: Date.now(),
          deviceId: deviceId
        };
        await gameService.saveState({
          ...gameState,
          submissions: [...(gameState.submissions || []), newLockEntry]
        });
      }
      setScreen('PRIZE_INFO');
    } catch (err) {
      setError('Lỗi kết nối. Thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPrice = async () => {
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
      setError('Không thể gửi giá. Thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderScreen = () => {
    if (isCloudLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500 font-bold italic">Đang đồng bộ Firebase...</p>
        </div>
      );
    }

    switch (screen) {
      case 'WAITING':
        return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 animate-in fade-in">
            <div className="bg-blue-100 p-6 rounded-full mb-8 animate-bounce-subtle">
              <Gift className="w-16 h-16 text-blue-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 mb-4 uppercase tracking-tighter italic leading-none">
              {gameState.options.eventName}<br/>
              <span className="text-blue-600 text-xl">SỰ KIỆN TRỰC TIẾP</span>
            </h1>
            <p className="text-slate-500 mb-10 font-bold italic">Chào mừng bạn tham gia!</p>
            
            {gameState.status === GameStatus.OPEN ? (
              <button 
                onClick={() => setScreen('LOGIN')}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl text-xl font-black shadow-xl shadow-blue-200 active:scale-95 transition-all uppercase italic tracking-tighter"
              >
                VÀO CHƠI NGAY
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4 bg-slate-50 p-6 rounded-[32px] border border-slate-100 w-full">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest italic">Chờ MC mở lượt quà...</p>
              </div>
            )}
          </div>
        );

      case 'LOGIN':
        return (
          <div className="p-8 animate-in slide-in-from-bottom-6">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase italic tracking-tighter">Định danh</h2>
              <p className="text-slate-500 text-sm font-bold italic">Nhập mã nhân viên cực đậm để bắt đầu</p>
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
                className="w-full pl-14 pr-6 py-6 bg-white border-4 rounded-[24px] text-2xl font-black outline-none transition-all text-slate-950 border-slate-100 focus:border-blue-500 focus:bg-blue-50/30 placeholder:text-slate-200"
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
            <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl border-4 border-white mb-8">
              <img 
                src={gameState.prize?.imageUrl || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800'} 
                alt="Prize" 
                className="w-full h-64 object-cover"
              />
              <div className="p-8">
                <h3 className="text-2xl font-black text-blue-600 mb-2 uppercase italic tracking-tighter leading-none">{gameState.prize?.name}</h3>
                <p className="text-slate-500 font-bold text-sm mb-6 italic leading-relaxed">{gameState.prize?.description}</p>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-[10px] text-emerald-700 font-black uppercase tracking-widest flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Đã khóa mã: {employeeId}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setScreen('INPUT_PRICE')}
              className="w-full py-5 bg-blue-600 text-white rounded-[24px] text-xl font-black shadow-xl active:scale-95 transition-all uppercase italic tracking-tighter"
            >
              NHẬP GIÁ DỰ ĐOÁN
            </button>
          </div>
        );

      case 'INPUT_PRICE':
        return (
          <div className="p-8 animate-in slide-in-from-right-8">
             <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase italic tracking-tighter">Dự đoán giá</h2>
              <p className="text-slate-500 text-sm font-bold italic">Nhập giá bạn cho là đúng nhất</p>
            </div>
            <div className="relative mb-8">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-300">₫</span>
              <input 
                type="text" 
                inputMode="numeric"
                value={guess}
                onChange={handlePriceChange}
                disabled={isSubmitting}
                placeholder="0"
                className="w-full pl-16 pr-6 py-8 bg-white border-4 border-slate-100 rounded-[32px] text-4xl font-black focus:border-blue-600 focus:bg-blue-50/20 outline-none transition-all text-blue-600 placeholder:text-slate-100"
              />
            </div>
            {error && <p className="text-red-500 mb-6 font-black bg-red-50 p-4 rounded-xl text-center text-xs italic uppercase">{error}</p>}
            <button 
              onClick={handleConfirmPrice}
              disabled={isSubmitting || !guess}
              className="w-full py-6 bg-blue-600 text-white rounded-[24px] text-xl font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 uppercase italic tracking-tighter"
            >
              {isSubmitting ? <Loader2 className="w-7 h-7 animate-spin" /> : 'GỬI KẾT QUẢ'}
            </button>
          </div>
        );

      case 'SUCCESS':
        return (
          <div className="p-8 flex flex-col items-center text-center animate-in zoom-in">
            <div className="bg-emerald-100 p-8 rounded-full mb-10 mt-10">
              <CheckCircle className="w-20 h-20 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase italic tracking-tighter">Đã gửi thành công!</h2>
            <p className="text-slate-400 mb-10 font-bold italic uppercase text-xs tracking-widest">Đang chờ BTC công bố kết quả...</p>
            
            <div className="w-full bg-slate-900 p-8 rounded-[40px] text-left shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-white"><DollarSign className="w-20 h-20" /></div>
              <div className="space-y-6 relative z-10">
                <div>
                  <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Mã nhân viên</p>
                  <p className="text-white font-black text-2xl tracking-tight">{mySubmission?.employeeId}</p>
                </div>
                <div>
                  <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Giá đã gửi</p>
                  <p className="text-white font-black text-4xl tracking-tighter">{mySubmission && formatVND(mySubmission.guess)}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'TIMEOUT':
        return (
          <div className="p-8 flex flex-col items-center text-center animate-in fade-in duration-500">
            <div className="bg-red-100 p-8 rounded-full mb-10 mt-10">
              <TimerOff className="w-20 h-20 text-red-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase italic tracking-tighter">HẾT THỜI GIAN!</h2>
            <p className="text-slate-500 mb-10 font-bold italic px-4">
              Bạn chưa kịp gửi giá dự đoán trong lượt này. Vui lòng tham gia ở lượt quà tiếp theo!
            </p>
            <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-[40px]">
               <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto mb-4" />
               <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest italic">Chờ MC mở lượt quà mới...</p>
            </div>
          </div>
        );

      case 'RESULT':
        const isWinner = gameState.winner?.deviceId === deviceId;
        return (
          <div className="p-8 flex flex-col items-center text-center animate-in fade-in duration-1000">
             {isWinner ? (
               <div className="w-full">
                 <div className="bg-yellow-400 p-10 rounded-full mb-10 mt-10 animate-bounce mx-auto w-fit shadow-[0_20px_50px_rgba(250,204,21,0.5)]">
                    <PartyPopper className="w-24 h-24 text-slate-900" />
                 </div>
                 <h2 className="text-5xl font-black text-slate-950 mb-4 italic tracking-tighter uppercase leading-none">CHÚC MỪNG BẠN!</h2>
                 <p className="text-2xl font-black text-blue-600 mb-10 uppercase italic tracking-tight">LÀ NGƯỜI CHIẾN THẮNG</p>
                 
                 <div className="bg-slate-950 p-10 rounded-[50px] shadow-2xl text-white border-4 border-yellow-400 relative">
                    <div className="absolute -top-4 -right-4 bg-yellow-400 p-3 rounded-2xl shadow-lg"><Trophy className="w-8 h-8 text-slate-950" /></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-yellow-400 opacity-80">Giá niêm yết chính xác</p>
                    <p className="text-5xl font-black tracking-tighter text-yellow-400">
                      {gameState.prize && formatVND(gameState.prize.realPrice)}
                    </p>
                 </div>
                 <p className="mt-10 font-black text-slate-400 uppercase text-xs italic">Vui lòng lên sân khấu nhận giải!</p>
               </div>
             ) : (
               <div className="w-full">
                 <div className="bg-slate-100 p-10 rounded-full mb-10 mt-10 mx-auto w-fit">
                    <Gift className="w-20 h-20 text-slate-300" />
                 </div>
                 <h2 className="text-3xl font-black text-slate-400 mb-4 uppercase italic tracking-tighter leading-none">CHIA BUỒN!</h2>
                 <p className="text-slate-500 mb-12 font-bold italic">Rất tiếc, bạn chưa trúng giải lần này.</p>
                 <div className="bg-white border-4 border-slate-50 p-10 rounded-[50px] text-slate-900 shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-slate-400">Giá đúng từ BTC</p>
                    <p className="text-4xl font-black tracking-tighter text-slate-950">{gameState.prize && formatVND(gameState.prize.realPrice)}</p>
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
      <header className="p-6 bg-white border-b border-slate-50 flex items-center justify-between sticky top-0 z-20">
        <span className="font-black text-lg tracking-tighter text-blue-600 italic uppercase">
          {gameState.options.eventName}
        </span>
        <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest shadow-lg">
           <div className={`w-2 h-2 rounded-full ${gameState.status === GameStatus.OPEN ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
           {gameState.status}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {renderScreen()}
      </main>
      <footer className="p-4 text-center opacity-10">
        <p className="text-[8px] font-bold uppercase tracking-widest">Device ID: {deviceId.substring(0, 12)}</p>
      </footer>
    </div>
  );
};
