
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";
import { GameState, GameStatus, Submission, RoundResult, AppOptions } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyD4G9RqK1mjroBRmbHalOkwuph8W2ilRzE",
  authDomain: "haychongiadung-ptc.firebaseapp.com",
  projectId: "haychongiadung-ptc",
  storageBucket: "haychongiadung-ptc.firebasestorage.app",
  messagingSenderId: "954923411067",
  appId: "1:954923411067:web:947062af0ad62fa533e4de",
  measurementId: "G-92BYGRYNLH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const stateDocRef = doc(db, 'game', 'globalState');

const DEVICE_ID_KEY = 'CHON_GIA_DUNG_DEVICE_ID';
const DEFAULT_OPTIONS: AppOptions = {
  eventName: 'CHỌN GIÁ ĐÚNG',
  orgName: 'AI-EVENT-TECH',
  primaryColor: '#2563eb',
  showQR: true
};

const DEFAULT_STATE: GameState = {
  status: GameStatus.IDLE,
  prize: null,
  submissions: [],
  winner: null,
  history: [],
  options: DEFAULT_OPTIONS
};

let currentState: GameState = DEFAULT_STATE;
let errorListener: ((err: string | null) => void) | null = null;
let connectionListener: (() => void) | null = null;

export const gameService = {
  getDeviceId(): string {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  },

  onError(callback: (err: string | null) => void) {
    errorListener = callback;
  },

  onConnected(callback: () => void) {
    connectionListener = callback;
  },

  subscribeToState(callback: (state: GameState) => void) {
    return onSnapshot(stateDocRef, (snapshot) => {
      const data = snapshot.data() as GameState;
      if (data) {
        currentState = {
          ...DEFAULT_STATE,
          ...data,
          submissions: data.submissions || [],
          history: data.history || [],
          options: { ...DEFAULT_OPTIONS, ...data.options }
        };
        callback(currentState);
        
        // Notify success if previously had an error or just connected
        if (errorListener) errorListener(null);
        if (connectionListener) connectionListener();
      } else {
        // First time initialization
        this.saveState(DEFAULT_STATE);
      }
    }, (error) => {
      console.error("Firestore Subscribe Error:", error);
      if (errorListener) {
        let msg = "Lỗi kết nối Cloud.";
        if (error.code === 'permission-denied') {
          msg = "Firestore API chưa được kích hoạt hoặc Rules bị chặn. Hãy kiểm tra lại Firebase Console.";
        }
        errorListener(msg);
      }
    });
  },

  getState(): GameState {
    return currentState;
  },

  async saveState(state: GameState) {
    try {
      await setDoc(stateDocRef, state);
      if (errorListener) errorListener(null);
    } catch (error: any) {
      console.error("Firestore Save Error:", error);
      if (errorListener) {
        errorListener(error.code === 'permission-denied' 
          ? "Lỗi: Không có quyền ghi. Hãy kiểm tra lại Firestore Rules." 
          : "Lỗi lưu dữ liệu.");
      }
    }
  },

  updateOptions(options: Partial<AppOptions>) {
    const state = this.getState();
    this.saveState({
      ...state,
      options: { ...state.options, ...options }
    });
  },

  resetGame() {
    this.saveState(DEFAULT_STATE);
  },

  prepareNewRound() {
    const state = this.getState();
    const newHistory = [...state.history];

    if (state.status === GameStatus.ANNOUNCED && state.winner && state.prize) {
      const result: RoundResult = {
        prizeName: state.prize.name,
        realPrice: state.prize.realPrice,
        winnerId: state.winner.employeeId,
        winnerGuess: state.winner.guess,
        timestamp: Date.now()
      };
      newHistory.unshift(result);
    }

    this.saveState({
      ...DEFAULT_STATE,
      history: newHistory,
      options: state.options
    });
  },

  calculateWinner(state: GameState): Submission | null {
    if (!state.prize || !state.submissions || state.submissions.length === 0) return null;

    const realPrice = state.prize.realPrice;
    const sortedSubmissions = [...state.submissions].sort((a, b) => a.timestamp - b.timestamp);

    const exactMatches = sortedSubmissions.filter(s => s.guess === realPrice);
    if (exactMatches.length > 0) return exactMatches[0];

    let closest = sortedSubmissions[0];
    let minDiff = Math.abs(closest.guess - realPrice);

    for (let i = 1; i < sortedSubmissions.length; i++) {
      const current = sortedSubmissions[i];
      const currentDiff = Math.abs(current.guess - realPrice);
      if (currentDiff < minDiff) {
        minDiff = currentDiff;
        closest = current;
      }
    }

    return closest;
  }
};
