
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameStatus, PlayerScreen, Submission } from '../types';
import { gameService } from '../services/gameService';
import { formatVND, formatTime } from './Formatters';
import { CheckCircle, Trophy, Clock, User, DollarSign, Gift, Loader2, BellRing } from 'lucide-react';

export const PlayerView: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(gameService.getState());
  const [screen, setScreen] = useState<PlayerScreen>('WAITING');
  const [employeeId, setEmployeeId] = useState('');
  const [guess, setGuess] = useState<string>('');
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [error, setError] = useState('');
  const deviceId = useRef(gameService.getDeviceId()).current;
  const lastStatus = useRef<GameStatus>(gameState.status);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  const sendWinnerNotification = (prizeName: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🎉 BẠN ĐÃ TRÚNG GIẢI!', {
        body: `Chúc mừng bạn đã trúng ${prizeName}. Hãy lên sân khấu nhận quà ngay!`,
        icon: '/favicon.ico'
      });
    }
    
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 500]);
    }
  };

  useEffect(() => {
    // Đăng ký lắng nghe Firebase thay vì Storage Event
    const unsubscribe = gameService.subscribeToState((newState) => {
      // Logic thông báo người thắng
      if (lastStatus.current !== GameStatus.ANNOUNCED && newState.status === GameStatus.ANNOUNCED) {
        if (newState.winner && newState.winner.deviceId === deviceId) {
          sendWinnerNotification(newState.prize?.name || 'phần quà');
        }
      }

      setGameState(newState);
      lastStatus.current = newState.status;

      // Tìm submission của tôi trong dữ liệu mới từ Cloud
      const foundMySub = newState.submissions.find(s => s.deviceId === deviceId);
      if (foundMySub) {
        setMySubmission(foundMySub);
        setEmployeeId(foundMySub.employeeId);
      }

      // Điều hướng màn hình dựa trên trạng thái game
      if (newState.status === GameStatus.IDLE) {
        setScreen('WAITING');
        setMySubmission(null);
      } else if (newState.status === GameStatus.ANNOUNCED && (foundMySub || mySubmission)) {
        setScreen('RESULT');
      } else if (newState.status === GameStatus.OPEN && foundMySub) {
        setScreen('SUCCESS');
      }
    });

    return () => unsubscribe();
  }, [deviceId, mySubmission]);

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

  const handleStart = async () => {
    await requestNotificationPermission();
    if (gameState.status === GameStatus.OPEN) {
      setScreen('LOGIN');
    }
  };

  const handleLogin = () => {
    if (!employeeId.trim()) {
      setError('Vui lòng nhập mã nhân viên');
      return;
    }
    
    const alreadyParticipated = gameState.submissions.find(
      s => s.employeeId === employeeId || s.deviceId === deviceId
    );

    if (alreadyParticipated) {
      setMySubmission(alreadyParticipated);
      setScreen('SUCCESS');
      return;
    }

    setScreen('PRIZE_INFO');
  };

  const handleConfirmPrice = () => {
    const numericGuess = parseInt(guess.replace(/\./g, ''));
    if (!numericGuess || numericGuess <= 0) {
      setError('Vui lòng nhập giá hợp lệ');
      return;
    }

    const newSubmission: Submission = {
      employeeId,
      guess: numericGuess,
      timestamp: Date.now(),
      deviceId: deviceId
    };

    const updatedState = {
      ...gameState,
      submissions: [...(gameState.submissions || []), newSubmission]
    };

    gameService.saveState(updatedState);
    setMySubmission(newSubmission);
    setScreen('SUCCESS');
  };

  const renderScreen = () => {
    switch (screen) {
      case 'WAITING':
        return (
          <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-6">
            <div className="bg-blue-100 p-6 rounded-full mb-8 animate-bounce-subtle">
              <Gift className="w-16 h-16 text-blue-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 mb-4 uppercase tracking-tight">
              Chọn Giá Đúng<br/><span className="text-blue-600">Trúng Quà Ngay</span>
            </h1>
            <p className="text-slate-500 mb-10 text-lg">Chào mừng bạn đến với trò chơi!</p>
            
            {gameState.status === GameStatus.OPEN ? (
              <button 
                onClick={handleStart}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl text-xl font-bold shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                BẮT ĐẦU THAM GIA
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 bg-slate-100 px-6 py-4 rounded-2xl text-slate-600 font-medium italic">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  BTC chưa mở lượt đoán...
                </div>
                <p className="text-[10px] text-slate-400 font-mono italic">Đang đồng bộ Cloud Realtime...</p>
              </div>
            )}
          </div>
        );

      case 'LOGIN':
        return (
          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Thông tin cá nhân</h2>
              <p className="text-slate-500">Mã nhân viên của bạn là gì?</p>
            </div>
            <div className="relative mb-6">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                placeholder="VD: NV1234"
                className="w-full pl-12 pr-4 py-5 bg-white border-2 border-slate-200 rounded-2xl text-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
              />
            </div>
            {error && <p className="text-red-500 mb-6 font-medium bg-red-50 p-3 rounded-lg text-center">{error}</p>}
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
          <div className="p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Thông tin món quà</h2>
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 mb-8">
              <img 
                src={gameState.prize?.imageUrl || 'https://picsum.photos/400/400?grayscale'} 
                alt="Prize" 
                className="w-full h-64 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-bold text-blue-600 mb-2">{gameState.prize?.name}</h3>
                <p className="text-slate-600 mb-4">{gameState.prize?.description}</p>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800 font-medium flex gap-2">
                  <BellRing className="w-4 h-4 shrink-0" />
                  <span>Hệ thống sẽ gửi thông báo đến máy bạn nếu bạn thắng giải!</span>
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
          <div className="p-6">
             <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Dự đoán của bạn</h2>
              <p className="text-slate-500">Hãy nhập con số bạn cho là đúng nhất</p>
            </div>
            <div className="relative mb-6">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">₫</span>
              <input 
                type="text" 
                inputMode="numeric"
                value={guess}
                onChange={handlePriceChange}
                placeholder="0"
                className="w-full pl-14 pr-4 py-8 bg-white border-2 border-slate-200 rounded-2xl text-4xl font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-blue-600"
              />
            </div>
            {error && <p className="text-red-500 mb-6 font-medium bg-red-50 p-3 rounded-lg text-center">{error}</p>}
            <button 
              onClick={handleConfirmPrice}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl text-xl font-bold shadow-lg active:scale-95 transition-all"
            >
              XÁC NHẬN GIÁ
            </button>
          </div>
        );

      case 'SUCCESS':
        return (
          <div className="p-6 flex flex-col items-center text-center">
            <div className="bg-green-100 p-6 rounded-full mb-8 mt-10">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Đã ghi nhận thành công!</h2>
            <p className="text-slate-500 mb-8">Hệ thống Cloud đã nhận được dự đoán của bạn.</p>
            
            <div className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 mb-8 text-left space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Mã nhân viên</span>
                <span className="text-slate-800 font-bold">{mySubmission?.employeeId}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Giá dự đoán</span>
                <span className="text-blue-600 font-black text-xl">{mySubmission && formatVND(mySubmission.guess)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm px-6 py-4 rounded-2xl text-slate-600 font-medium">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              Đợi BTC công bố kết quả...
            </div>
          </div>
        );

      case 'RESULT':
        const isWinner = gameState.winner?.deviceId === deviceId;
        return (
          <div className="p-6 flex flex-col items-center text-center relative overflow-hidden min-h-[70vh]">
             {isWinner ? (
               <div className="animate-in fade-in zoom-in duration-1000">
                 <div className="bg-yellow-100 p-8 rounded-full mb-8 mt-10 animate-bounce relative z-10">
                    <Trophy className="w-20 h-20 text-yellow-600" />
                 </div>
                 <h2 className="text-3xl font-black text-slate-800 mb-4 relative z-10 uppercase italic tracking-tighter">BẠN ĐÃ THẮNG!</h2>
                 <p className="text-slate-600 text-lg mb-8 leading-relaxed relative z-10">Dự đoán của bạn là chính xác nhất!</p>
                 <div className="bg-yellow-50 border-2 border-yellow-400 p-6 rounded-3xl w-full relative z-10">
                    <p className="text-yellow-800 font-bold mb-1 uppercase text-xs tracking-widest">Giá niêm yết</p>
                    <p className="text-4xl font-black text-yellow-600">{gameState.prize && formatVND(gameState.prize.realPrice)}</p>
                 </div>
               </div>
             ) : (
               <div className="animate-in fade-in duration-500">
                 <div className="bg-slate-100 p-8 rounded-full mb-8 mt-10 opacity-60">
                    <Gift className="w-20 h-20 text-slate-400" />
                 </div>
                 <h2 className="text-3xl font-bold text-slate-800 mb-4 uppercase italic">KẾT THÚC LƯỢT</h2>
                 <p className="text-slate-600 text-lg mb-8 leading-relaxed">Hẹn gặp bạn ở phần quà tiếp theo nhé!</p>
                 <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl w-full opacity-70">
                    <p className="text-slate-500 font-bold mb-1 uppercase text-xs tracking-widest">Giá đúng</p>
                    <p className="text-3xl font-bold text-slate-800">{gameState.prize && formatVND(gameState.prize.realPrice)}</p>
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
      <header className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
        <span className="font-black text-lg tracking-tighter text-blue-600 italic uppercase">CHỌN GIÁ ĐÚNG</span>
        <div className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
           <div className={`w-2 h-2 rounded-full ${gameState.status === GameStatus.OPEN ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
           {gameState.status}
        </div>
      </header>
      <main className="flex-1 mobile-height">
        {renderScreen()}
      </main>
    </div>
  );
};
