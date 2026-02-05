
import PocketBase from 'pocketbase';
import { GameState, GameStatus, Submission, RoundResult, AppOptions, Prize } from '../types';

const PB_URL = 'https://lawrence-pct-unlike-hand.trycloudflare.com';
const pb = new PocketBase(PB_URL);

// Tắt tự động hủy request để tránh lỗi "autocancelled" trong React StrictMode
pb.autoCancellation(false);

/**
 * Các Keys định danh trong bảng app_data
 */
const KEYS = {
  SETTINGS: 'game_settings',
  SUBMISSIONS: 'game_submissions',
  HISTORY: 'game_history'
};

const DEFAULT_OPTIONS: AppOptions = {
  eventName: 'CHỌN GIÁ ĐÚNG',
  orgName: 'AI-EVENT-TECH',
  primaryColor: '#2563eb',
  showQR: true
};

let currentLocalState: GameState = {
  status: GameStatus.IDLE,
  prize: null,
  submissions: [],
  winner: null,
  history: [],
  options: DEFAULT_OPTIONS
};

let isInitializing = false;
let isInitialized = false;

const listeners: Set<(state: GameState) => void> = new Set();

export const gameService = {
  async init() {
    if (isInitialized || isInitializing) return;
    isInitializing = true;

    try {
      // 1. Auth (Hỗ trợ cả superusers và admins cũ)
      try {
        await pb.collection('_superusers').authWithPassword('vippro21295@gmail.com', 'K4FUj6heBMCyHM9');
      } catch (e) {
        try {
          // @ts-ignore
          await pb.admins.authWithPassword('vippro21295@gmail.com', 'K4FUj6heBMCyHM9');
        } catch (e2) {
          console.warn("PB Auth failed, continuing as guest/public if allowed.");
        }
      }

      // 2. Đảm bảo collection app_data tồn tại
      await this.ensureAppDataCollection();

      // 3. Khởi tạo các bản ghi Key-Value mặc định nếu chưa có
      await this.initializeKeys();

      // 4. Đồng bộ dữ liệu ban đầu
      await this.syncAll();

      // 5. Subscribe Realtime
      pb.collection('app_data').subscribe('*', (e) => {
        if (Object.values(KEYS).includes(e.record.key)) {
          this.syncAll();
        }
      });
      
      isInitialized = true;
      console.log('PocketBase (Key-Value Mode): Ready.');
    } catch (error: any) {
      if (!error.isAbort) {
        console.error('Init Error:', error);
      }
    } finally {
      isInitializing = false;
    }
  },

  async ensureAppDataCollection() {
    try {
      const collections = await pb.collections.getFullList();
      if (!collections.find(c => c.name === 'app_data')) {
        await pb.collections.create({
          name: 'app_data',
          type: 'base',
          schema: [
            { name: 'key', type: 'text', required: true, unique: true },
            { name: 'value', type: 'json' }
          ],
          listRule: "", viewRule: "", createRule: "", updateRule: ""
        });
      }
    } catch (e) {}
  },

  async initializeKeys() {
    const checkAndCreate = async (key: string, defaultValue: any) => {
      try {
        await pb.collection('app_data').getFirstListItem(`key="${key}"`);
      } catch (err: any) {
        if (err.status === 404) {
          await pb.collection('app_data').create({ key, value: defaultValue });
        }
      }
    };

    await Promise.all([
      checkAndCreate(KEYS.SETTINGS, { status: GameStatus.IDLE, prize: null, winner_id: null, options: DEFAULT_OPTIONS }),
      checkAndCreate(KEYS.SUBMISSIONS, []),
      checkAndCreate(KEYS.HISTORY, [])
    ]);
  },

  async syncAll() {
    try {
      const records = await pb.collection('app_data').getFullList();
      
      const getVal = (key: string) => records.find(r => r.key === key)?.value;

      const settings = getVal(KEYS.SETTINGS) || {};
      const subs = getVal(KEYS.SUBMISSIONS) || [];
      const history = getVal(KEYS.HISTORY) || [];

      const mappedSubmissions: Submission[] = subs.map((s: any) => ({
        employeeId: s.employeeId,
        guess: Number(s.guess),
        timestamp: s.timestamp,
        deviceId: s.deviceId || '' // Đồng bộ deviceId
      }));

      currentLocalState = {
        status: settings.status || GameStatus.IDLE,
        prize: settings.prize || null,
        submissions: mappedSubmissions,
        winner: settings.winner_id ? mappedSubmissions.find(s => s.employeeId === settings.winner_id) || null : null,
        history: history,
        options: settings.options || DEFAULT_OPTIONS
      };

      this.notify();
    } catch (err: any) {
      // Bỏ qua log nếu lỗi do hủy request chủ động
      if (!err.isAbort) {
        console.error("Sync Error:", err.message);
      }
    }
  },

  getState(): GameState {
    return currentLocalState;
  },

  // Fix: Ensure the cleanup function returns void to satisfy React's EffectCallback type.
  // Set.prototype.delete returns a boolean, which causes Type mismatch in useEffect cleanups.
  subscribe(callback: (state: GameState) => void) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  notify() {
    listeners.forEach(cb => cb(currentLocalState));
    window.dispatchEvent(new Event('storage'));
  },

  async updateValueByKey(key: string, newValue: any) {
    try {
      const record = await pb.collection('app_data').getFirstListItem(`key="${key}"`);
      await pb.collection('app_data').update(record.id, { value: newValue });
    } catch (err: any) {
      if (!err.isAbort) {
        console.error(`Update Error (Key: ${key}):`, err.data || err.message);
      }
      throw err;
    }
  },

  async saveState(state: Partial<GameState>) {
    const record = await pb.collection('app_data').getFirstListItem(`key="${KEYS.SETTINGS}"`);
    const currentSettings = record.value;
    
    const updatedSettings = {
      ...currentSettings,
      status: state.status !== undefined ? state.status : currentSettings.status,
      prize: state.prize !== undefined ? state.prize : currentSettings.prize,
      winner_id: state.winner !== undefined ? state.winner?.employeeId : currentSettings.winner_id,
      options: state.options !== undefined ? state.options : currentSettings.options
    };

    await pb.collection('app_data').update(record.id, { value: updatedSettings });
  },

  async submitGuess(submission: Submission) {
    const record = await pb.collection('app_data').getFirstListItem(`key="${KEYS.SUBMISSIONS}"`);
    const currentSubs = Array.isArray(record.value) ? record.value : [];
    
    // Kiểm tra trùng ID (Server-side check dự phòng)
    if (currentSubs.some((s: any) => s.employeeId === submission.employeeId)) {
      throw new Error('Mã nhân viên này đã tham gia dự đoán.');
    }

    const updatedSubs = [...currentSubs, {
      employeeId: submission.employeeId,
      guess: Number(submission.guess),
      timestamp: Date.now(),
      deviceId: submission.deviceId // Lưu deviceId vào DB
    }];

    await pb.collection('app_data').update(record.id, { value: updatedSubs });
  },

  async updateOptions(options: Partial<AppOptions>) {
    const record = await pb.collection('app_data').getFirstListItem(`key="${KEYS.SETTINGS}"`);
    const currentSettings = record.value;
    
    const updatedSettings = {
      ...currentSettings,
      options: { ...currentSettings.options, ...options }
    };

    await pb.collection('app_data').update(record.id, { value: updatedSettings });
  },

  async resetGame() {
    await Promise.all([
      this.updateValueByKey(KEYS.SETTINGS, { 
        status: GameStatus.IDLE, 
        prize: null, 
        winner_id: null, 
        options: currentLocalState.options 
      }),
      this.updateValueByKey(KEYS.SUBMISSIONS, [])
    ]);
  },

  async prepareNewRound() {
    const state = currentLocalState;
    if (state.status === GameStatus.ANNOUNCED && state.winner && state.prize) {
      const record = await pb.collection('app_data').getFirstListItem(`key="${KEYS.HISTORY}"`);
      const currentHistory = Array.isArray(record.value) ? record.value : [];
      
      const newHistoryItem: RoundResult = {
        prizeName: state.prize.name,
        realPrice: state.prize.realPrice,
        winnerId: state.winner.employeeId,
        winnerGuess: state.winner.guess,
        timestamp: Date.now()
      };

      await pb.collection('app_data').update(record.id, { value: [newHistoryItem, ...currentHistory].slice(0, 50) });
    }
    await this.resetGame();
  },

  calculateWinner(state: GameState): Submission | null {
    if (!state.prize || state.submissions.length === 0) return null;
    const realPrice = Number(state.prize.realPrice);
    
    let closest = state.submissions[0];
    let minDiff = Math.abs(Number(closest.guess) - realPrice);

    for (const sub of state.submissions) {
      const diff = Math.abs(Number(sub.guess) - realPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closest = sub;
      } else if (diff === minDiff) {
        if (sub.timestamp < closest.timestamp) closest = sub;
      }
    }
    return closest;
  }
};
