
export enum GameStatus {
  IDLE = 'IDLE',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  ANNOUNCED = 'ANNOUNCED'
}

export interface Prize {
  name: string;
  description: string;
  realPrice: number;
  imageUrl?: string;
}

export interface Submission {
  employeeId: string;
  guess: number;
  timestamp: number;
  deviceId: string; // Thêm định danh thiết bị
}

export interface RoundResult {
  prizeName: string;
  realPrice: number;
  winnerId: string;
  winnerGuess: number;
  timestamp: number;
}

export interface AppOptions {
  eventName: string;
  orgName: string;
  primaryColor: string;
  showQR: boolean;
}

export interface GameState {
  status: GameStatus;
  prize: Prize | null;
  submissions: Submission[];
  winner: Submission | null;
  history: RoundResult[];
  options: AppOptions;
}

export type AppMode = 'PLAYER' | 'ADMIN' | 'ANNOUNCER' | 'PUBLIC_DISPLAY';
export type AdminTab = 'dashboard' | 'settings';
export type PlayerScreen = 'WAITING' | 'LOGIN' | 'PRIZE_INFO' | 'INPUT_PRICE' | 'SUCCESS' | 'RESULT' | 'TIMEOUT';
