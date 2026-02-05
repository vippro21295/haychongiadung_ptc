
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, GameStatus, PlayerScreen, Submission } from '../types';
import { gameService } from '../services/gameService';
import { formatVND, formatTime, formatNumberWithDots, parseNumberFromDots } from './Formatters';
import { CheckCircle, Trophy, Clock, User, DollarSign, Gift, Loader2, AlertTriangle, Frown, Hourglass } from 'lucide-react';

/**
 * Hàm lấy hoặc tạo mã thiết bị duy nhất cho máy khách
 */
const getDeviceId = (): string => {
  let id = localStorage.getItem('game_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('game_device_id', id);
  }
  return id;
};

export const PlayerView: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(gameService.getState());
  const [screen, setScreen] = useState<PlayerScreen>('WAITING');
  const [employeeId, setEmployeeId] = useState('');
  const [guess, setGuess] = useState<string>('');
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deviceId] = useState<string>(getDeviceId());

  // Lấy mã nhân viên từ URL hash khi component mount
  useEffect(() => {
    const handleHashSync = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#player/')) {
        const idFromHash = hash.replace('#player/', '');
        if (idFromHash) {
          setEmployeeId(idFromHash.toUpperCase());
        }
      }
    };

    handleHashSync();
    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, []);

  const refreshState = useCallback(() => {
    const newState = gameService.getState();
    setGameState(newState);
    
    // Nếu Admin reset game, đưa người chơi về màn hình chờ
    if (newState.status === GameStatus.IDLE) {
      setScreen('WAITING');
      setMySubmission(null);
      setError('');
    } 
    // Nếu có kết quả và người chơi này đã tham gia, chuyển đến màn hình kết quả
    else if (newState.status === GameStatus.ANNOUNCED && mySubmission) {
      setScreen('RESULT');
    }
  }, [mySubmission]);

  useEffect(() => {
    refreshState();
    return gameService.subscribe(refreshState);
  }, [refreshState]);

  const handleStart = () => {
    if (gameState.status === GameStatus.OPEN) {
      setScreen('LOGIN');
    }
  };

  const handleLogin = () => {
    setError('');
    const cleanId = employeeId.trim().toUpperCase();
    if (!cleanId) {
      setError('Vui lòng nhập mã nhân viên');
      return;
    }
    
    // KIỂM TRA TRÙNG: Nếu mã NV đã tồn tại trong hệ thống
    const alreadyParticipated = gameState.submissions.find(s => s.employeeId === cleanId);
    
    if (alreadyParticipated) {
      // Nếu trùng, thông báo và xóa trắng để nhập lại
      setError('Mã nhân viên này đã có người sử dụng. Vui lòng nhập mã khác!');
      setEmployeeId('');
      
      // Sau 3 giây tự động xóa thông báo lỗi để giao diện sạch sẽ
      setTimeout(() => setError(''), 3000);
      return;
    }

    setScreen('PRIZE_INFO');
  };

  const handleConfirmPrice = async () => {
    // Kiểm tra Timeout ngay lập tức nếu Admin đóng lượt đoán
    if (gameState.status === GameStatus.CLOSED) {
      setScreen('TIMEOUT');
      return;
    }

    const numericGuess = parseInt(parseNumberFromDots(guess));
    if (!numericGuess || numericGuess <= 0) {
      setError('Vui lòng nhập giá hợp lệ');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const newSubmission: Submission = {
        employeeId: employeeId.trim().toUpperCase(),
        guess: numericGuess,
        timestamp: Date.now(),
        deviceId: deviceId // Đính kèm mã thiết bị khi submit
      };

      await gameService.submitGuess(newSubmission);
      setMySubmission(newSubmission);
      setScreen('SUCCESS');
    } catch (err: any) {
      setError(err.message || 'Không thể gửi dự đoán. Thử lại sau.');
      // Nếu lỗi do trùng (giả sử server trả về), reset về login
      if (err.message?.includes('đã tham gia')) {
        setTimeout(() => {
          setScreen('LOGIN');
          setEmployeeId('');
          setError('');
        }, 2000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderScreen = () => {
    switch (screen) {
      case 'WAITING':
        return (
          <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-6 animate-in fade-in duration-500">
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
                className="w-full py-5 bg-blue-600 text-white rounded-2xl text-xl font-bold shadow-xl shadow-blue-200 active:scale-95 transition-all"
              >
                BẮT ĐẦU THAM GIA
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-slate-100 px-6 py-4 rounded-2xl text-slate-600 font-medium italic">
                <Loader2 className="w-5 h-5 animate-spin" />
                BTC chưa mở lượt đoán...
              </div>
            )}
          </div>
        );

      case 'LOGIN':
        return (
          <div className="p-6 animate-in slide-in-from-right duration-300">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Thông tin cá nhân</h2>
              <p className="text-slate-500">Mã nhân viên của bạn là gì?</p>
            </div>
            <div className="relative mb-6">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="VD: NV1234"
                className={`w-full pl-12 pr-4 py-5 bg-white border-2 rounded-2xl text-xl focus:ring-4 outline-none transition-all ${error ? 'border-red-500 focus:ring-red-50' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-50'}`}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-600 mb-6 font-bold bg-red-50 p-4 rounded-xl text-sm border border-red-100 animate-pulse">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                {error}
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
          <div className="p-6 animate-in slide-in-from-right duration-300">
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
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800 font-medium">
                  💡 Giá thật sẽ được công bố sau khi kết thúc lượt đoán.
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
          <div className="p-6 animate-in slide-in-from-right duration-300">
             <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Dự đoán của bạn</h2>
              <p className="text-slate-500">Hãy nhập con số bạn cho là đúng nhất</p>
            </div>
            <div className="relative mb-6">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">₫</span>
              <input 
                type="text" 
                value={formatNumberWithDots(guess)}
                onChange={(e) => setGuess(parseNumberFromDots(e.target.value))}
                placeholder="0"
                className="w-full pl-14 pr-4 py-8 bg-white border-2 border-slate-200 rounded-2xl text-4xl font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-blue-600"
              />
            </div>
            <div className="flex gap-2 text-amber-600 bg-amber-50 p-4 rounded-xl mb-8 items-start">
              <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">Lưu ý: Giá đã xác nhận sẽ không thể thay đổi. Hãy kiểm tra kỹ!</p>
            </div>
            {error && <p className="text-red-500 mb-6 font-medium bg-red-50 p-3 rounded-lg text-center">{error}</p>}
            <button 
              onClick={handleConfirmPrice}
              disabled={isSubmitting}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl text-xl font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'ĐANG GỬI...' : 'XÁC NHẬN GIÁ'}
            </button>
          </div>
        );

      case 'SUCCESS':
        return (
          <div className="p-6 flex flex-col items-center text-center animate-in fade-in duration-700">
            <div className="bg-green-100 p-6 rounded-full mb-8 mt-10">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Đã ghi nhận thành công!</h2>
            <p className="text-slate-500 mb-8">Hệ thống đã nhận được dự đoán của bạn.</p>
            
            <div className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 mb-8 text-left space-y-4 shadow-inner">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Mã nhân viên</span>
                <span className="text-slate-800 font-bold">{mySubmission?.employeeId}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Giá đã nhập</span>
                <span className="text-blue-600 font-black text-xl">{mySubmission && formatVND(mySubmission.guess)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Mã thiết bị</span>
                <span className="text-[10px] text-slate-400 font-mono">{deviceId.substring(0, 8)}...</span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm px-6 py-4 rounded-2xl text-slate-600 font-medium">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              Vui lòng theo dõi kết quả trên sân khấu
            </div>
          </div>
        );

      case 'TIMEOUT':
        return (
          <div className="p-6 flex flex-col items-center text-center animate-in fade-in duration-700 min-h-[80vh] justify-center">
            <div className="bg-red-100 p-8 rounded-full mb-8">
              <Hourglass className="w-20 h-20 text-red-600 animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-4 uppercase tracking-tighter">HẾT GIỜ RỒI!</h2>
            <p className="text-slate-600 text-lg mb-10 leading-relaxed italic">
              Rất tiếc, BTC đã đóng cổng nhận dự đoán.<br/>Hãy chuẩn bị cho lượt quà tiếp theo nhé!
            </p>
            <button 
              onClick={() => setScreen('WAITING')}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-all"
            >
              VỀ MÀN HÌNH CHỜ
            </button>
          </div>
        );

      case 'RESULT':
        // KIỂM TRA TRÚNG THƯỞNG DỰA TRÊN DEVICE ID
        const isWinnerDevice = gameState.winner?.deviceId === deviceId;
        const isWinnerID = gameState.winner?.employeeId === mySubmission?.employeeId;
        const isActuallyWinning = isWinnerDevice || isWinnerID;

        return (
          <div className="p-6 flex flex-col items-center text-center animate-in zoom-in duration-500">
             {isActuallyWinning ? (
               <>
                 <div className="bg-yellow-100 p-8 rounded-full mb-8 mt-10 animate-bounce shadow-lg shadow-yellow-100/50">
                    <Trophy className="w-20 h-20 text-yellow-600" />
                 </div>
                 <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tighter">BẠN ĐÃ CHIẾN THẮNG!</h2>
                 <p className="text-slate-600 text-lg mb-8 leading-relaxed">Xin chúc mừng! Bạn là người có dự đoán chính xác nhất lượt này.</p>
                 <div className="bg-yellow-50 border-4 border-yellow-400 p-6 rounded-[32px] w-full shadow-xl">
                    <p className="text-yellow-800 font-black uppercase text-xs tracking-widest mb-2">Giá niêm yết từ BTC</p>
                    <p className="text-4xl font-black text-yellow-600 italic tracking-tighter">
                      {gameState.prize && formatVND(gameState.prize.realPrice)}
                    </p>
                 </div>
                 <p className="mt-8 text-slate-400 text-xs font-bold uppercase tracking-widest">Hãy mang thiết bị này lên sân khấu nhận quà!</p>
               </>
             ) : (
               <>
                 <div className="bg-slate-100 p-8 rounded-full mb-8 mt-10 opacity-60">
                    <Frown className="w-20 h-20 text-slate-400" />
                 </div>
                 <h2 className="text-3xl font-bold text-slate-800 mb-4">CHƯA MAY MẮN RỒI!</h2>
                 <p className="text-slate-600 text-lg mb-8 leading-relaxed italic">Cảm ơn bạn đã tham gia. Giá bạn dự đoán chưa sát với giá thực tế nhất.</p>
                 <div className="bg-slate-50 border border-slate-200 p-6 rounded-[32px] w-full opacity-70">
                    <p className="text-slate-500 font-bold mb-1 uppercase text-[10px] tracking-widest">Giá niêm yết từ BTC</p>
                    <p className="text-3xl font-black text-slate-800 italic tracking-tighter">
                      {gameState.prize && formatVND(gameState.prize.realPrice)}
                    </p>
                 </div>
                 <p className="mt-8 text-blue-600 font-black uppercase tracking-tighter text-sm">Cố gắng ở lượt quà tiếp theo nhé!</p>
               </>
             )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 shadow-2xl relative flex flex-col">
      <header className="p-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-50">
        <span className="font-black text-lg tracking-tighter text-blue-600 italic">CHỌN GIÁ ĐÚNG</span>
        <div className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
           <div className={`w-1.5 h-1.5 rounded-full ${gameState.status === GameStatus.OPEN ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
           {gameState.status}
        </div>
      </header>
      <main className="flex-1 mobile-height">
        {renderScreen()}
      </main>
    </div>
  );
};
