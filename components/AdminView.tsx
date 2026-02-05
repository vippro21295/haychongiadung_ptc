
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameStatus, Prize, Submission, AdminTab, AppOptions } from '../types';
import { gameService } from '../services/gameService';
import { formatVND, formatTime, formatNumberWithDots, parseNumberFromDots } from './Formatters';
import { 
  Play, Square, Trophy, Users, RefreshCw, BarChart, 
  Settings, Save, Search, Trash2, ArrowUpDown, ChevronRight,
  ShieldCheck, LayoutDashboard, Monitor, Gift, Upload, Image as ImageIcon,
  QrCode, X, LayoutGrid, BarChart2, Palette, Info, Check
} from 'lucide-react';

const COLOR_PRESETS = [
  { name: 'Blue', value: '#2563eb' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Pink', value: '#db2777' },
];

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800';

export const AdminView: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(gameService.getState());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Prize form state
  const [prizeName, setPrizeName] = useState(gameState.prize?.name || '');
  const [prizeDesc, setPrizeDesc] = useState(gameState.prize?.description || '');
  const [realPrice, setRealPrice] = useState(gameState.prize?.realPrice.toString() || '');
  const [imageUrl, setImageUrl] = useState(gameState.prize?.imageUrl || DEFAULT_IMAGE);

  // App Options form state
  const [eventName, setEventName] = useState(gameState.options.eventName);
  const [orgName, setOrgName] = useState(gameState.options.orgName);
  const [primaryColor, setPrimaryColor] = useState(gameState.options.primaryColor);

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const refreshState = useCallback(() => {
    const state = gameService.getState();
    setGameState(state);
    
    // Nếu có món quà, đồng bộ vào form
    if (state.prize) {
       setPrizeName(state.prize.name);
       setPrizeDesc(state.prize.description);
       setRealPrice(state.prize.realPrice.toString());
       setImageUrl(state.prize.imageUrl || DEFAULT_IMAGE);
    } else {
       // Nếu món quà là null (khi sang lượt mới), xóa sạch form
       setPrizeName('');
       setPrizeDesc('');
       setRealPrice('');
       setImageUrl(DEFAULT_IMAGE);
    }
  }, []);

  useEffect(() => {
    refreshState();
    return gameService.subscribe(refreshState);
  }, [refreshState]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsLoggedIn(true);
    } else {
      alert('Sai mật khẩu!');
    }
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
    const rawPrice = parseNumberFromDots(realPrice);
    if (!prizeName || !rawPrice) {
      alert('Vui lòng nhập tên quà và giá trị thật');
      return;
    }
    const prize: Prize = {
      name: prizeName,
      description: prizeDesc,
      realPrice: parseInt(rawPrice),
      imageUrl: imageUrl
    };
    
    gameService.saveState({
      status: GameStatus.OPEN,
      prize,
      submissions: [],
      winner: null
    });
  };

  const handleCloseRound = () => {
    gameService.saveState({ status: GameStatus.CLOSED });
  };

  const handleAnnounce = () => {
    const winner = gameService.calculateWinner(gameState);
    gameService.saveState({ status: GameStatus.ANNOUNCED, winner });
  };

  const handleSaveSettings = () => {
    gameService.updateOptions({
      eventName,
      orgName,
      primaryColor
    });
    alert('Đã cập nhật cài đặt thành công!');
  };

  const handleReset = () => {
    if (confirm('CẢNH BÁO: Bạn có chắc chắn muốn XOÁ TOÀN BỘ dữ liệu hệ thống?')) {
      gameService.resetGame();
      alert('Hệ thống đã được reset.');
      refreshState();
    }
  };

  const sortedSubmissions = [...gameState.submissions].sort((a, b) => 
    sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-6">
        <form onSubmit={handleLogin} className="bg-white p-10 rounded-[32px] shadow-2xl w-full max-w-md">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-blue-600 p-4 rounded-2xl mb-4 shadow-lg shadow-blue-200">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-wider italic">ADMIN LOGIN</h1>
            <p className="text-slate-500 text-sm font-medium">Xác thực quyền vận hành sự kiện</p>
          </div>
          <div className="space-y-6">
            <input 
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-600 outline-none transition-all text-lg font-mono text-center"
              placeholder="••••••••" autoFocus
            />
            <button className="w-full py-4 bg-slate-900 text-white font-black rounded-xl shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase italic tracking-tighter">
              Đăng nhập hệ thống
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <aside className="w-64 bg-[#0f172a] text-slate-400 p-6 flex flex-col gap-10 shadow-2xl z-20">
        <div className="flex items-center gap-3 text-white">
          <div className="bg-blue-600 p-2 rounded-lg"><LayoutGrid className="w-5 h-5" /></div>
          <span className="font-black text-lg tracking-tight italic">ADMIN HUB</span>
        </div>
        
        <nav className="flex-1 flex flex-col gap-8">
          <div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">Vận hành</div>
            <div className="space-y-1">
              <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-[#1e293b] text-white shadow-sm' : 'hover:bg-white/5'}`}>
                <Monitor className="w-5 h-5" /> Dashboard
              </button>
              <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'settings' ? 'bg-[#1e293b] text-white shadow-sm' : 'hover:bg-white/5'}`}>
                <Settings className="w-5 h-5" /> Cài đặt chung
              </button>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">Điều khiển</div>
            <div className="space-y-1">
              <button onClick={handleReset} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 rounded-xl font-bold transition-all text-[#ef4444]">
                <Trash2 className="w-5 h-5" /> Reset Hệ thống
              </button>
            </div>
          </div>
        </nav>
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-white/5">
          <p className="text-[10px] font-black mb-2 uppercase tracking-widest text-slate-500">Server Status</p>
          <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div> Online & Ready
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <header className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
              {activeTab === 'dashboard' ? 'Điều khiển sự kiện' : 'Cấu hình hệ thống'}
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              {activeTab === 'dashboard' ? 'Quản lý các lượt đoán và công bố kết quả realtime' : 'Tùy chỉnh thông tin chương trình và giao diện'}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trạng thái hiện tại</p>
              <div className="bg-white border border-slate-100 px-4 py-1.5 rounded-xl shadow-sm">
                <span className="text-sm font-black text-slate-800 uppercase tracking-wider">{gameState.status}</span>
              </div>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-12 gap-8 lg:gap-10">
            <div className="col-span-12 lg:col-span-4 space-y-8">
              <section className="bg-white p-6 lg:p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
                <div className="flex items-center gap-3 mb-8 text-slate-800 font-black text-lg uppercase italic tracking-tighter">
                  <Gift className="w-6 h-6 text-blue-600" /> Cài đặt món quà
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tên món quà</label>
                    <input 
                      type="text" value={prizeName} onChange={(e) => setPrizeName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:border-blue-600 outline-none font-bold text-slate-800"
                      disabled={gameState.status !== GameStatus.IDLE}
                      placeholder="VD: iPhone 16 Pro Max"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Giá trị thật (VNĐ)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-blue-600/50">₫</span>
                      <input 
                        type="text" 
                        value={formatNumberWithDots(realPrice)} 
                        onChange={(e) => setRealPrice(parseNumberFromDots(e.target.value))}
                        className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-blue-600 outline-none font-black text-blue-600 text-2xl tracking-tighter italic"
                        disabled={gameState.status !== GameStatus.IDLE}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Mô tả/Thông số</label>
                    <textarea 
                      value={prizeDesc} onChange={(e) => setPrizeDesc(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:border-blue-600 outline-none h-20 resize-none font-medium text-slate-600 text-sm"
                      disabled={gameState.status !== GameStatus.IDLE}
                      placeholder="Nhập mô tả ngắn về quà..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Ảnh món quà</label>
                    <div 
                      onClick={() => gameState.status === GameStatus.IDLE && triggerFileUpload()}
                      className={`relative w-full aspect-video rounded-[24px] overflow-hidden border-2 border-dashed transition-all flex flex-col items-center justify-center ${
                        gameState.status === GameStatus.IDLE ? 'border-slate-200 bg-slate-50 hover:border-blue-400 cursor-pointer group' : 'border-slate-100 bg-slate-50 opacity-50'
                      }`}
                    >
                      {imageUrl ? (
                        <>
                          <img src={imageUrl} alt="Prize" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                          {gameState.status === GameStatus.IDLE && (
                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Upload className="w-6 h-6 text-white mb-2" />
                              <span className="text-white text-[10px] font-black uppercase tracking-widest">Thay đổi ảnh</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center text-slate-300">
                          <ImageIcon className="w-10 h-10 mb-2" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Nhấn để tải ảnh</span>
                        </div>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-[#0f172a] p-5 lg:p-6 rounded-[30px] shadow-2xl space-y-3">
                <h2 className="text-white font-black mb-4 flex items-center gap-3 uppercase tracking-wider text-[10px] italic">
                  <Play className="w-4 h-4 text-blue-500" /> Bảng điều khiển
                </h2>
                <div className="flex flex-col gap-2">
                  {gameState.status === GameStatus.IDLE && (
                    <button onClick={handleOpenRound} className="w-full py-3 bg-blue-600 text-white rounded-[16px] font-black text-sm hover:bg-blue-500 active:scale-95 transition-all shadow-xl shadow-blue-900/40 uppercase italic tracking-tighter">
                      Mở lượt đoán
                    </button>
                  )}
                  {gameState.status === GameStatus.OPEN && (
                    <button onClick={handleCloseRound} className="w-full py-3 bg-red-600 text-white rounded-[16px] font-black text-sm hover:bg-red-500 active:scale-95 transition-all shadow-xl shadow-red-900/40 uppercase italic tracking-tighter">
                      Đóng lượt đoán
                    </button>
                  )}
                  {gameState.status === GameStatus.CLOSED && (
                    <button onClick={handleAnnounce} className="w-full py-3 bg-purple-600 text-white rounded-[16px] font-black text-sm hover:bg-purple-500 active:scale-95 transition-all shadow-xl shadow-purple-900/40 uppercase italic tracking-tighter">
                      Công bố kết quả
                    </button>
                  )}
                  {gameState.status === GameStatus.ANNOUNCED && (
                    <button onClick={() => gameService.prepareNewRound()} className="w-full py-3 bg-green-600 text-white rounded-[16px] font-black text-sm hover:bg-green-500 active:scale-95 transition-all shadow-xl shadow-green-900/40 uppercase italic tracking-tighter flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Lượt quà tiếp theo
                    </button>
                  )}
                </div>
              </section>
            </div>

            <div className="col-span-12 lg:col-span-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-all">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tổng tham gia</p>
                    <p className="text-5xl font-black text-slate-800 tracking-tighter">{gameState.submissions.length}</p>
                  </div>
                  <div className="bg-blue-50 p-5 rounded-[28px] text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Users className="w-8 h-8" />
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-all">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Trạng thái</p>
                    <p className={`text-2xl font-black italic tracking-tighter uppercase ${gameState.status === GameStatus.OPEN ? 'text-green-500' : 'text-slate-400'}`}>
                      {gameState.status === GameStatus.OPEN ? 'ĐANG NHẬN GIÁ' : 'TẠM DỪNG'}
                    </p>
                  </div>
                  <div className="bg-amber-50 p-5 rounded-[28px] text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <BarChart2 className="w-8 h-8" />
                  </div>
                </div>
              </div>

              <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden min-h-[500px]">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h2 className="text-lg font-black text-slate-800 uppercase italic flex items-center gap-3 tracking-tighter">
                    <Search className="w-5 h-5 text-slate-400" /> Danh sách realtime
                  </h2>
                  <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[9px] font-black text-slate-500 transition-all shadow-sm uppercase tracking-widest">
                    <ArrowUpDown className="w-3.5 h-3.5" /> Mới nhất: {sortOrder === 'desc' ? 'Trước' : 'Sau'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Nhân viên</th>
                        <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Giá dự đoán</th>
                        <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {sortedSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-8 py-24 text-center text-slate-400 font-black italic text-lg">
                            Chưa có dữ liệu tham gia...
                          </td>
                        </tr>
                      ) : (
                        sortedSubmissions.map((sub, idx) => {
                          const isWinner = gameState.winner?.employeeId === sub.employeeId;
                          return (
                            <tr key={idx} className={`hover:bg-slate-50/50 transition-all ${isWinner ? 'bg-yellow-50/50' : ''}`}>
                              <td className="px-8 py-5 font-bold text-slate-800 flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-black shadow-sm ${isWinner ? 'bg-yellow-500 animate-bounce' : 'bg-[#334155]'}`}>
                                  {isWinner ? <Trophy className="w-4 h-4" /> : sub.employeeId.charAt(0)}
                                </div>
                                <span className="text-base">{sub.employeeId}</span>
                              </td>
                              <td className={`px-8 py-5 font-black italic tracking-tighter text-xl ${isWinner ? 'text-yellow-600' : 'text-blue-600'}`}>
                                {formatVND(sub.guess)}
                              </td>
                              <td className="px-8 py-5 text-right font-bold text-slate-300 font-mono tracking-tighter text-sm">
                                {formatTime(sub.timestamp)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="bg-white p-8 lg:p-10 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-slate-800"></div>
              <div className="flex items-center gap-3 mb-8 text-slate-800 font-black text-xl uppercase italic tracking-tighter">
                <Info className="w-7 h-7 text-slate-800" /> Thông tin chương trình
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tên chương trình (Hiển thị Header)</label>
                  <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-blue-600 outline-none font-bold text-slate-800 uppercase" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Đơn vị tổ chức</label>
                  <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-blue-600 outline-none font-bold text-slate-800 uppercase" />
                </div>
              </div>
            </section>
            <section className="bg-white p-8 lg:p-10 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
              <div className="flex items-center gap-3 mb-8 text-slate-800 font-black text-xl uppercase italic tracking-tighter">
                <Palette className="w-7 h-7 text-blue-600" /> Màu sắc chủ đạo
              </div>
              <p className="text-slate-500 text-sm mb-8">Lựa chọn tông màu chính cho toàn bộ giao diện sự kiện (Admin, MC, Màn hình lớn)</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-6">
                {COLOR_PRESETS.map((color) => (
                  <button key={color.value} onClick={() => setPrimaryColor(color.value)} className={`aspect-square rounded-3xl flex items-center justify-center transition-all ${primaryColor === color.value ? 'ring-4 ring-offset-4 ring-blue-500 scale-110 shadow-lg' : 'hover:scale-105 opacity-70'}`} style={{ backgroundColor: color.value }}>
                    {primaryColor === color.value && <Check className="w-8 h-8 text-white stroke-[4px]" />}
                  </button>
                ))}
              </div>
            </section>
            <div className="flex justify-end pt-4">
               <button onClick={handleSaveSettings} className="px-10 py-5 bg-slate-900 text-white rounded-3xl font-black text-lg hover:bg-slate-800 active:scale-95 transition-all shadow-xl flex items-center gap-3 uppercase italic tracking-tighter">
                 <Save className="w-6 h-6" /> Lưu thay đổi
               </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
