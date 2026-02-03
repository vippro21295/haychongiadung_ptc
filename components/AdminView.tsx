
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameStatus, Prize, Submission, AdminTab, AppOptions } from '../types';
import { gameService } from '../services/gameService';
import { formatVND, formatTime } from './Formatters';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Play, Square, Trophy, Users, RefreshCw, BarChart, 
  Settings, Save, Search, Trash2, ArrowUpDown, ChevronRight,
  ShieldCheck, LayoutDashboard, Monitor, Gift, Upload, Image as ImageIcon,
  QrCode, X, LayoutGrid, BarChart2, Palette, Info, Check, Cloud, Link as LinkIcon, Copy, Share2
} from 'lucide-react';

const COLOR_PRESETS = [
  { name: 'Blue', value: '#2563eb' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Pink', value: '#db2777' },
];

export const AdminView: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(gameService.getState());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [showShareModal, setShowShareModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [prizeName, setPrizeName] = useState('');
  const [prizeDesc, setPrizeDesc] = useState('');
  const [realPrice, setRealPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800');

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
      
      if (state.prize && prizeName === '') {
        setPrizeName(state.prize.name);
        setPrizeDesc(state.prize.description);
        setRealPrice(state.prize.realPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
        setImageUrl(state.prize.imageUrl || imageUrl);
      }
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
    }
  };

  const sortedSubmissions = [...(gameState.submissions || [])].sort((a, b) => 
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
            <h1 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">ADMIN LOGIN</h1>
          </div>
          <div className="space-y-6">
            <input 
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none text-slate-900 font-mono text-center"
              placeholder="admin123" autoFocus
            />
            <button className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase italic tracking-tighter">Đăng nhập</button>
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
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Chia sẻ link chơi</h2>
            <p className="text-slate-500 text-sm mb-8 font-medium">Quét mã bằng 4 điện thoại để bắt đầu test realtime</p>
            
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

      <aside className="w-64 bg-[#0f172a] text-slate-400 p-6 flex flex-col gap-10 shadow-2xl z-20 shrink-0">
        <div className="flex items-center gap-3 text-white">
          <div className="bg-blue-600 p-2 rounded-lg"><LayoutGrid className="w-5 h-5" /></div>
          <span className="font-black text-lg tracking-tight italic">ADMIN CLOUD</span>
        </div>
        
        <nav className="flex-1 flex flex-col gap-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${activeTab === 'dashboard' ? 'bg-[#1e293b] text-white' : 'hover:bg-white/5'}`}>
            <Monitor className="w-5 h-5" /> Dashboard
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold ${activeTab === 'settings' ? 'bg-[#1e293b] text-white' : 'hover:bg-white/5'}`}>
            <Settings className="w-5 h-5" /> Cài đặt
          </button>
          <button onClick={() => setShowShareModal(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold hover:bg-white/5 text-blue-400">
            <Share2 className="w-5 h-5" /> Chia sẻ link chơi
          </button>
          <button onClick={handleReset} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 rounded-xl font-bold text-red-400 mt-10">
            <Trash2 className="w-5 h-5" /> Reset Cloud
          </button>
        </nav>

        <div className="bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
          <p className="text-[9px] font-black mb-1 uppercase tracking-widest text-green-500">Cloud Connected</p>
          <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div> Firebase Live
          </div>
        </div>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto">
        <header className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
              {activeTab === 'dashboard' ? 'Điều khiển Realtime' : 'Cấu hình sự kiện'}
            </h1>
            <p className="text-slate-500 font-medium mt-1">Hệ thống đang đồng bộ với {gameState.submissions.length} thiết bị</p>
          </div>
          <button 
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase italic tracking-tighter shadow-lg shadow-blue-200 hover:bg-blue-500 transition-all active:scale-95"
          >
            <QrCode className="w-5 h-5" /> Hiện mã QR
          </button>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 lg:col-span-4 space-y-10">
              <section className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center gap-3 mb-4 text-slate-800 font-black text-xl uppercase italic tracking-tighter">
                  <Gift className="w-7 h-7 text-blue-600" /> Thiết lập lượt
                </div>
                <input 
                  type="text" value={prizeName} onChange={(e) => setPrizeName(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold"
                  placeholder="Tên quà tặng" disabled={gameState.status !== GameStatus.IDLE}
                />
                <input 
                  type="text" value={realPrice} onChange={handlePriceChange}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-blue-600 text-2xl"
                  placeholder="Giá thật (VNĐ)" disabled={gameState.status !== GameStatus.IDLE}
                />
                <div 
                  onClick={() => gameState.status === GameStatus.IDLE && triggerFileUpload()}
                  className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl overflow-hidden cursor-pointer flex items-center justify-center"
                >
                  <img src={imageUrl} className="w-full h-full object-cover" />
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                </div>
                
                <div className="pt-6 space-y-4">
                  {gameState.status === GameStatus.IDLE && <button onClick={handleOpenRound} className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black uppercase italic tracking-tighter shadow-xl shadow-blue-200 transition-all active:scale-95">Mở lượt đoán</button>}
                  {gameState.status === GameStatus.OPEN && <button onClick={handleCloseRound} className="w-full py-5 bg-red-600 text-white rounded-[24px] font-black uppercase italic tracking-tighter shadow-xl shadow-red-200 transition-all active:scale-95">Đóng lượt đoán</button>}
                  {gameState.status === GameStatus.CLOSED && <button onClick={handleAnnounce} className="w-full py-5 bg-purple-600 text-white rounded-[24px] font-black uppercase italic tracking-tighter shadow-xl shadow-purple-200 transition-all active:scale-95">Công bố kết quả</button>}
                  {gameState.status === GameStatus.ANNOUNCED && <button onClick={() => gameService.prepareNewRound()} className="w-full py-5 bg-green-600 text-white rounded-[24px] font-black uppercase italic tracking-tighter shadow-xl shadow-green-200 transition-all active:scale-95">Lượt tiếp theo</button>}
                </div>
              </section>
            </div>

            <div className="col-span-12 lg:col-span-8 space-y-10">
              <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden min-h-[500px]">
                <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h2 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-3">
                    <Users className="w-6 h-6 text-blue-600" /> Luồng dữ liệu (Live)
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-50">
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Người chơi</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá dự đoán</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {sortedSubmissions.map((sub, idx) => (
                        <tr key={idx} className={`animate-in fade-in slide-in-from-right-4 ${gameState.winner?.employeeId === sub.employeeId ? 'bg-yellow-50' : ''}`}>
                          <td className="px-10 py-6 font-bold text-slate-800">{sub.employeeId}</td>
                          <td className="px-10 py-6 font-black italic text-2xl text-blue-600">{formatVND(sub.guess)}</td>
                          <td className="px-10 py-6 text-right font-mono text-slate-300 text-xs">{formatTime(sub.timestamp)}</td>
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
            <section className="bg-white p-10 rounded-[40px] border border-slate-100 space-y-8">
              <div className="flex items-center gap-3 text-slate-800 font-black text-xl uppercase italic">
                <Palette className="w-7 h-7" /> Giao diện & Thương hiệu
              </div>
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên chương trình</label>
                <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold" />
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Đơn vị tổ chức</label>
                <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold" />
              </div>
              <button onClick={handleSaveSettings} className="px-10 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase italic tracking-tighter">Lưu cài đặt</button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
