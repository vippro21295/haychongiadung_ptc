
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameStatus, PlayerScreen, Submission } from '../types';
import { gameService } from '../services/gameService';
import { formatVND, formatTime } from './Formatters';
import { CheckCircle, Trophy, Clock, User, DollarSign, Gift, Loader2, BellRing, AlertTriangle, CloudOff } from 'lucide-react';

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

  useEffect(() => {
    const unsubscribe = gameService.subscribeToState((newState) => {
      setIsCloudLoading(false);
      
      if (lastStatus.current !== GameStatus.ANNOUNCED && newState.status === GameStatus.ANNOUNCED) {
        if (newState.winner && newState.winner.deviceId === deviceId) {
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        }
      }

      setGameState(newState);
      lastStatus.current = newState.status;

      const foundMySub = (newState.submissions || []).find(s => s.deviceId === deviceId);
      if (foundMySub) {
        setMySubmission(foundMySub);
        setEmployeeId(foundMySub.employeeId);
      }

      if (newState.status === GameStatus.IDLE) {
        setScreen('WAITING');
        setMySubmission(null);
        setGuess('');
        setEmployeeId('');
      } else if (newState.status === GameStatus.ANNOUNCED && (foundMySub || mySubmission)) {
        setScreen('RESULT');
      } else if (newState.status === GameStatus.OPEN && foundMySub) {
        setScreen('SUCCESS');
      }
    });

    // Timeout để báo lỗi nếu kết nối quá lâu
    const timer = setTimeout(() => {
      if (isCloudLoading) setIsCloudLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [deviceId, mySubmission, isCloudLoading]);

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

  const handleLogin = () => {
    const cleanId = employeeId.trim().toUpperCase();
    if (!cleanId) {
      setError('Vui lòng nhập mã nhân viên của bạn');
      return;
    }

    const existingSubWithId = (gameState.submissions || []).find(
      s => s.employeeId.toUpperCase() === cleanId
    );

    if (existingSubWithId) {
      if (existingSubWithId.deviceId !== deviceId) {
        setError(`Mã ${cleanId} đã được sử dụng bởi người khác.`);
        return;
      } else {
        setMySubmission(existingSubWithId);
        setScreen('SUCCESS');
        return;
      }
    }

    setError('');
    setScreen('PRIZE_INFO');
  };

  const handleConfirmPrice = async () => {
    const numericGuess = parseInt(guess.replace(/\./g, ''));
    if (!numericGuess || numericGuess <= 0) {
      setError('Vui lòng nhập giá dự đoán hợp lệ');
      return;
    }

    const cleanId = employeeId.trim().toUpperCase();
    setIsSubmitting(true);

    try {
      const isDuplicate = (gameState.submissions || []).some(
        s => s.employeeId.toUpperCase() === cleanId && s.deviceId !== deviceId
      );

      if (isDuplicate) {
        setError('Mã nhân viên này vừa được người khác sử dụng!');
        setScreen('LOGIN');
        setIsSubmitting(false);
        return;
      }

      const newSubmission: Submission = {
        employeeId: cleanId,
        guess: numericGuess,
        timestamp: Date.now(),
        deviceId: deviceId
      };

      const updatedSubmissions = [...(gameState.submissions || []), newSubmission];
      
      await gameService.saveState({
        ...gameState,
        submissions: updatedSubmissions
      });

      setMySubmission(newSubmission);
      setScreen('SUCCESS');
    } catch (err) {
      setError('Lỗi kết nối Cloud. Vui lòng kiểm tra internet!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderScreen = () => {
    if (isCloudLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500 font-bold italic">Đang kết nối Firebase Cloud...</p>
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
            <h1 className="text-3xl font-extrabold text-slate-800 mb-4 uppercase tracking-tight">
              {gameState.options.eventName}<br/><span className="text-blue-600">Trúng Quà Ngay</span>
            </h1>
            <p className="text-slate-500 mb-10 text-lg">Chào mừng bạn đến với sự kiện!</p>
            
            {gameState.status === GameStatus.OPEN ? (
              <button 
                onClick={() => setScreen('LOGIN')}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl text-xl font-bold shadow-xl shadow-blue-200 active:scale-95 transition-all"
              >
                BẮT ĐẦU THAM GIA
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 bg-slate-100 px-6 py-4 rounded-2xl text-slate-600 font-medium italic">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang chờ BTC mở lượt...
                </div>
              </div>
            )}
          </div>
        );

      case 'LOGIN':
        return (
          <div className="p-6 animate-in slide-in-from-bottom-4">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Định danh người chơi</h2>
              <p className="text-slate-500 text-sm">Nhập mã nhân viên để hệ thống trao giải chính xác</p>
            </div>
            <div className="relative mb-6">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="VÍ DỤ: NV001"
                className={`w-full pl-12 pr-4 py-5 bg-white border-2 rounded-2xl text-xl font-bold outline-none transition-all ${error ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'}`}
              />
            </div>
            {error && (
              <div className="flex items-start gap-3 text-red-600 mb-6 font-bold bg-red-50 p-4 rounded-2xl border border-red-200 animate-in shake-1">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            <button 
              onClick={handleLogin}
              className="w-full py-5 bg-slate-800 text-white rounded-2xl text-xl font-bold shadow-lg active:scale-95 transition-all"
            >
              TIẾP TỤC
            </button>
          </div>
        );

      case 'PRIZE_INFO':
        return (
          <div className="p-6 animate-in fade-in">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Thông tin món quà</h2>
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 mb-8">
              <img 
                src={gameState.prize?.imageUrl || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800'} 
                alt="Prize" 
                className="w-full h-56 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-bold text-blue-600 mb-1">{gameState.prize?.name}</h3>
                <p className="text-slate-500 text-sm mb-4">{gameState.prize?.description}</p>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-xs text-blue-800 font-medium flex gap-2">
                  <BellRing className="w-4 h-4 shrink-0" />
                  <span>Hệ thống sẽ tự động thông báo nếu bạn trúng giải!</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setScreen('INPUT_PRICE')}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl text-xl font-bold shadow-lg active:scale-95 transition-all"
            >
              NHẬP GIÁ DỰ ĐOÁN
            </button>
          </div>
        );

      case 'INPUT_PRICE':
        return (
          <div className="p-6 animate-in slide-in-from-right-8">
             <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Giá dự đoán</h2>
              <p className="text-slate-500 text-sm">Dự đoán giá niêm yết của sản phẩm này</p>
            </div>
            <div className="relative mb-6">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">₫</span>
              <input 
                type="text" 
                inputMode="numeric"
                value={guess}
                onChange={handlePriceChange}
                placeholder="0"
                className="w-full pl-14 pr-4 py-8 bg-white border-2 border-slate-200 rounded-3xl text-4xl font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-blue-600"
              />
            </div>
            {error && <p className="text-red-500 mb-6 font-bold bg-red-50 p-3 rounded-lg text-center text-sm">{error}</p>}
            <button 
              onClick={handleConfirmPrice}
              disabled={isSubmitting}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl text-xl font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'GỬI KẾT QUẢ'}
            </button>
          </div>
        );

      case 'SUCCESS':
        return (
          <div className="p-6 flex flex-col items-center text-center animate-in zoom-in">
            <div className="bg-green-100 p-6 rounded-full mb-8 mt-10">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Gửi thành công!</h2>
            <p className="text-slate-500 mb-8 px-4 text-sm">Hệ thống đã ghi nhận dự đoán của bạn.</p>
            
            <div className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 mb-8 text-left space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Mã nhân viên</span>
                <span className="text-slate-800 font-black">{mySubmission?.employeeId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Giá đã dự đoán</span>
                <span className="text-blue-600 font-black text-2xl">{mySubmission && formatVND(mySubmission.guess)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm px-6 py-4 rounded-2xl text-slate-600 font-bold text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              Chờ MC công bố giải thưởng...
            </div>
          </div>
        );

      case 'RESULT':
        const isWinner = gameState.winner?.deviceId === deviceId;
        return (
          <div className="p-6 flex flex-col items-center text-center animate-in fade-in duration-700">
             {isWinner ? (
               <div className="w-full">
                 <div className="bg-yellow-100 p-8 rounded-full mb-8 mt-10 animate-bounce mx-auto w-fit">
                    <Trophy className="w-20 h-20 text-yellow-600" />
                 </div>
                 <h2 className="text-4xl font-black text-slate-900 mb-4 italic tracking-tighter uppercase">BẠN ĐÃ CHIẾN THẮNG!</h2>
                 <p className="text-slate-600 mb-8">Con số của bạn là chính xác nhất!</p>
                 <div className="bg-yellow-400 p-6 rounded-[32px] shadow-xl text-slate-900">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">Giá niêm yết</p>
                    <p className="text-4xl font-black">{gameState.prize && formatVND(gameState.prize.realPrice)}</p>
                 </div>
               </div>
             ) : (
               <div className="w-full opacity-80">
                 <div className="bg-slate-100 p-8 rounded-full mb-8 mt-10 mx-auto w-fit">
                    <Gift className="w-20 h-20 text-slate-400" />
                 </div>
                 <h2 className="text-3xl font-bold text-slate-800 mb-4 uppercase italic">KẾT THÚC LƯỢT</h2>
                 <p className="text-slate-500 mb-10">Chúc bạn may mắn hơn ở lượt sau!</p>
                 <div className="bg-slate-200 p-6 rounded-[32px] text-slate-700">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-50">Giá đúng là</p>
                    <p className="text-3xl font-bold">{gameState.prize && formatVND(gameState.prize.realPrice)}</p>
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
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 shadow-2xl relative flex flex-col">
      <header className="p-5 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
        <span className="font-black text-base tracking-tighter text-blue-600 italic uppercase">
          {gameState.options.eventName}
        </span>
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest">
           <div className={`w-1.5 h-1.5 rounded-full ${gameState.status === GameStatus.OPEN ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
           {gameState.status}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        {renderScreen()}
      </main>
      <footer className="p-4 text-center opacity-30">
        <p className="text-[8px] font-bold uppercase tracking-widest">Device ID: {deviceId.substring(0, 8)}</p>
      </footer>
    </div>
  );
};
