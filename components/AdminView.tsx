
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameStatus, Prize, Submission, AdminTab, AppOptions } from '../types';
import { gameService } from '../services/gameService';
import { formatVND, formatTime } from './Formatters';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Play, Square, Trophy, Users, RefreshCw, BarChart, 
  Settings, Save, Search, Trash2, ArrowUpDown, ChevronRight,
  ShieldCheck, LayoutDashboard, Monitor, Gift, Upload, Image as ImageIcon,
  QrCode, X, LayoutGrid, BarChart2, Palette, Info, Check, Cloud, Link as LinkIcon, Copy, Share2, Activity
} from 'lucide-react';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800';

export const AdminView: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(gameService.getState());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [showShareModal, setShowShareModal] = useState(false);
  const [ping, setPing] = useState(42);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [prizeName, setPrizeName] = useState('');
  const [prizeDesc, setPrizeDesc] = useState('');
  const [realPrice, setRealPrice] = useState('');
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE);

  const [eventName, setEventName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const unsubscribe = gameService.subscribeToState((state) => {
      setGameState(state);
      setEventName(state.options.eventName);
      setOrgName(state.options.orgName);
      setPrimaryColor(state.options.primaryColor);
      
      // Đồng bộ từ Cloud về UI Admin nếu game đã bắt đầu
      if (state.prize && state.status !== GameStatus.IDLE) {
        setPrizeName(state.prize.name);
        setPrizeDesc(state.prize.description);
        setRealPrice(state.prize.realPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
        setImageUrl(state.prize.imageUrl || DEFAULT_IMAGE);
      }
      
      setPing(Math.floor(Math.random() * (60 - 30) + 30));
    });

    return () => unsubscribe();
  }, []);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue === '') {
      setRealPrice('');
      return;
    }
    const formatted = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setRealPrice(formatted);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsLoggedIn(true);
    } else {
      alert('Sai mật khẩu!');
    }
  };

  const copyToClipboard = () => {
    const url = window.location.origin + window.location.pathname;
    navigator.clipboard.writeText(url);
    alert('Đã copy link gửi cho người chơi!');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  const handleOpenRound = () => {
    if (!prizeName || !realPrice) {
      alert('Vui lòng nhập tên quà và giá trị thật');
      return;
    }
    const prize: Prize = {
      name: prizeName,
      description: prizeDesc,
      realPrice: parseInt(realPrice.replace(/\./g, '')),
      imageUrl: imageUrl
    };
    
    gameService.saveState({
      ...gameState,
      status: GameStatus.OPEN,
      prize,
      submissions: [],
      winner: null
    });
  };

  const handleCloseRound = () => {
    gameService.saveState({ ...gameState, status: GameStatus.CLOSED });
  };

  const handleAnnounce = () => {
    const winner = gameService.calculateWinner(gameState);
    gameService.saveState({ ...gameState, status: GameStatus.ANNOUNCED, winner });
  };

  const handlePrepareNextRound = () => {
    // Reset cục bộ admin
    setPrizeName('');
    setPrizeDesc('');
    setRealPrice('');
    setImageUrl(DEFAULT_IMAGE);
    
    // Đẩy lệnh reset lên Cloud
    gameService.prepareNewRound();
  };

  const handleSaveSettings = () => {
    gameService.updateOptions({
      eventName,
      orgName,
      primaryColor
    });
    alert('Đã đồng bộ cài đặt lên Cloud!');
  };

  const handleReset = () => {
    if (confirm('XOÁ TOÀN BỘ dữ liệu trên Cloud?')) {
      gameService.resetGame();
      setPrizeName('');
      setPrizeDesc('');
      setRealPrice('');
      setImageUrl(DEFAULT_IMAGE);
    }
  };

  // Chỉ hiển thị những người đã gửi giá thực tế (guess > 0)
  const validSubmissions = (gameState.submissions || []).filter(s => s.guess > 0);
  const sortedSubmissions = [...validSubmissions].sort((a, b) => 
    sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-6 text-slate-100">
        <form onSubmit={handleLogin} className="bg-white p-10 rounded-[32px] shadow-2xl w-full max-w-md">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-blue-600 p-4 rounded-2xl mb-4">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">HỆ THỐNG QUẢN TRỊ</h1>
          </div>
          <div className="space-y-6">
            <input 
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none text-slate-900 font-mono text-center text-2xl tracking-widest"
              placeholder="••••••••" autoFocus
            />
            <button className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase italic tracking-tighter hover:bg-black transition-all">Xác nhận</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex relative">
      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[40px] shadow-2xl max-w-sm w-full p-10 flex flex-col items-center text-center animate-in zoom-in duration-300">
            <button onClick={() => setShowShareModal(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full">
              <X className="w-6 h-6 text-slate-400" />
            </button>
            <div className="bg-blue-600 p-4 rounded-2xl mb-6 shadow-lg shadow-blue-200">
              <Share2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Chia sẻ link</h2>
            <p className="text-slate-500 text-sm mb-8 font-medium italic">Gửi link hoặc mã QR cho khách tham gia</p>
            
            <div className="bg-white p-4 rounded-3xl shadow-inner border-2 border-slate-50 mb-8">
              <QRCodeSVG value={window.location.origin + window.location.pathname} size={200} level="H" includeMargin={false} />
            </div>

            <button 
              onClick={copyToClipboard}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95"
            >
              <Copy className="w-5 h-5" /> Copy Link tham gia
            </button>
          </div>
        </div>
      )}

      <aside className="w-64 bg-[#0f172a] text-slate-400 p-6 flex flex-col gap-10 shadow-2xl z-20 shrink-0 border-r border-white/5">
        <div className="flex items-center gap-3 text-white">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/40"><Cloud className="w-5 h-5 text-white" /></div>
          <span className="font-black text-lg tracking-tight italic">FIRESTORE LIVE</span>
        </div>
        
        <nav className="flex-1 flex flex-col gap-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-white/5 hover:text-white'}`}>
            <LayoutDashboard className="w-5 h-5" /> Tổng quan
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-white/5 hover:text-white'}`}>
            <Settings className="w-5 h-5" /> Cấu hình sự kiện
          </button>
          <div className="h-px bg-white/5 my-4"></div>
          <button onClick={() => setShowShareModal(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold hover:bg-white/5 text-blue-400 transition-all">
            <Share2 className="w-5 h-5" /> Link người chơi
          </button>
          <button onClick={handleReset} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 rounded-xl font-bold text-red-400 mt-10 transition-all">
            <Trash2 className="w-5 h-5" /> Xóa dữ liệu Cloud
          </button>
        </nav>

        <div className="bg-emerald-500/10 p-5 rounded-3xl border border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Trực tuyến</p>
            <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-black italic">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div> Latency: {ping}ms
          </div>
          <p className="text-[8px] text-emerald-500/60 mt-2 font-bold uppercase tracking-tight">Syncing globalState...</p>
        </div>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto">
        <header className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
              {activeTab === 'dashboard' ? 'Bàn điều khiển' : 'Cài đặt hệ thống'}
            </h1>
            <p className="text-slate-500 font-bold mt-2 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
               {validSubmissions.length} lượt dự đoán đã gửi lên Cloud
            </p>
          </div>
          <div className="flex gap-4">
             <button 
                onClick={() => window.open(window.location.origin + window.location.pathname + '#public', '_blank')}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black uppercase italic tracking-tighter shadow-sm hover:bg-slate-50 transition-all active:scale-95"
              >
                <Monitor className="w-5 h-5" /> Màn hình lớn
              </button>
              <button 
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase italic tracking-tighter shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
              >
                <QrCode className="w-5 h-5" /> Mã QR
              </button>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 lg:col-span-4 space-y-10">
              <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-5">
                <div className="flex items-center gap-3 mb-2 text-slate-800 font-black text-xl uppercase italic tracking-tighter">
                  <Gift className="w-7 h-7 text-blue-600" /> Cấu hình lượt chơi
                </div>
                
                <div className="space-y-3">
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Tên quà tặng</label>
                        <input 
                            type="text" value={prizeName} onChange={(e) => setPrizeName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-slate-950 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm"
                            placeholder="Ví dụ: iPhone 16 Pro Max" disabled={gameState.status !== GameStatus.IDLE}
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Mô tả quà tặng</label>
                        <textarea 
                            value={prizeDesc} onChange={(e) => setPrizeDesc(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl font-black text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all h-16 resize-none text-sm"
                            placeholder="Mô tả quà tặng..." disabled={gameState.status !== GameStatus.IDLE}
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Giá trị niêm yết</label>
                        <input 
                            type="text" value={realPrice} onChange={handlePriceChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-blue-600 text-xl focus:bg-white focus:border-blue-500 outline-none transition-all"
                            placeholder="0 ₫" disabled={gameState.status !== GameStatus.IDLE}
                        />
                    </div>
                </div>

                <div 
                  onClick={() => gameState.status === GameStatus.IDLE && triggerFileUpload()}
                  className="h-60 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden cursor-pointer flex items-center justify-center group relative transition-all hover:border-blue-300"
                >
                  <img src={imageUrl} className="w-full h-full object-cover transition-all group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <Upload className="w-8 h-8 text-white" />
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                </div>
                
                <div className="pt-2 space-y-3">
                  {gameState.status === GameStatus.IDLE && <button onClick={handleOpenRound} className="w-full py-4 bg-blue-600 text-white rounded-[20px] font-black uppercase italic tracking-tighter shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95">Mở lượt tham gia</button>}
                  {gameState.status === GameStatus.OPEN && <button onClick={handleCloseRound} className="w-full py-4 bg-red-600 text-white rounded-[20px] font-black uppercase italic tracking-tighter shadow-lg shadow-red-200 transition-all hover:bg-red-700 active:scale-95">Đóng lượt (Khóa giá)</button>}
                  {gameState.status === GameStatus.CLOSED && <button onClick={handleAnnounce} className="w-full py-4 bg-purple-600 text-white rounded-[20px] font-black uppercase italic tracking-tighter shadow-lg shadow-purple-200 transition-all hover:bg-purple-700 active:scale-95">Công bố người thắng</button>}
                  {gameState.status === GameStatus.ANNOUNCED && <button onClick={handlePrepareNextRound} className="w-full py-4 bg-emerald-600 text-white rounded-[20px] font-black uppercase italic tracking-tighter shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-95">Tiếp tục lượt quà mới</button>}
                </div>
              </section>
            </div>

            <div className="col-span-12 lg:col-span-8 space-y-10">
              <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h2 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-3">
                    <Activity className="w-6 h-6 text-blue-600" /> Bảng giá thời gian thực
                  </h2>
                  <div className="flex items-center gap-4">
                     <span className="text-[10px] font-black uppercase text-slate-400">Tự động cập nhật</span>
                     <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                  </div>
                </div>
                <div className="flex-1 overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
                      <tr className="border-b border-slate-100">
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">STT</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã nhân viên</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá dự đoán</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {sortedSubmissions.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-10 py-20 text-center text-slate-300 font-bold italic uppercase tracking-widest">
                                Đang chờ người chơi gửi giá...
                            </td>
                        </tr>
                      ) : sortedSubmissions.map((sub, idx) => (
                        <tr key={idx} className={`group hover:bg-slate-50 transition-all ${gameState.winner?.employeeId === sub.employeeId ? 'bg-yellow-50' : ''}`}>
                          <td className="px-10 py-6 text-slate-400 font-mono">{sortedSubmissions.length - idx}</td>
                          <td className="px-10 py-6 font-bold text-slate-800">{sub.employeeId}</td>
                          <td className="px-10 py-6 font-black italic text-2xl text-blue-600">{formatVND(sub.guess)}</td>
                          <td className="px-10 py-6 text-right font-mono text-slate-400 text-xs">{formatTime(sub.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl space-y-10">
            <section className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
              <div className="flex items-center gap-3 text-slate-800 font-black text-xl uppercase italic">
                <Palette className="w-7 h-7 text-blue-600" /> Tùy chỉnh thương hiệu
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên sự kiện</label>
                    <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:bg-white outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Đơn vị tổ chức</label>
                    <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:bg-white outline-none" />
                </div>
              </div>
              <button onClick={handleSaveSettings} className="px-10 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase italic tracking-tighter shadow-xl shadow-slate-200 hover:bg-black transition-all">Lưu và đồng bộ Cloud</button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
