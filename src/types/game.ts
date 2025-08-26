export interface Game {
  id: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  currentQuarter: number;
  timeRemaining: number; // in seconds - server authoritative
  quarterLength: number; // in minutes - for display purposes
  status: 'scheduled' | 'live' | 'break' | 'finished';
  isRunning: boolean;
  timerStartedAt?: Date; // when timer was last started for server-side calculation
  lastServerTime?: number; // last calculated server time for sync
  createdAt: Date;
  updatedAt: Date;
}

export interface GameSettings {
  quarterLength: number; // in minutes, default 15
  breakLength: number; // in minutes, default 3
  totalQuarters: number; // default 4
}

export const DEFAULT_SETTINGS: GameSettings = {
  quarterLength: 15,
  breakLength: 3,
  totalQuarters: 4,
};

export interface CreateGameRequest {
  teamA: string;
  teamB: string;
  settings?: Partial<GameSettings>;
}
