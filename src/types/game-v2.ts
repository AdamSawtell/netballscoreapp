/**
 * Game Data Models V2 - Pure game data without timer coupling
 * Phase 2.2: Clean separation of concerns
 */

// Pure game data - no timer logic
export interface GameData {
  id: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  currentQuarter: number;
  status: 'scheduled' | 'live' | 'break' | 'finished';
  settings: GameSettings;
  createdAt: Date;
  updatedAt: Date;
}

// Timer configuration stored with game
export interface GameSettings {
  quarterLength: number; // in minutes
  breakLength: number; // in minutes  
  totalQuarters: number;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  quarterLength: 15,
  breakLength: 3,
  totalQuarters: 4,
};

// Request interface for creating games
export interface CreateGameRequest {
  teamA: string;
  teamB: string;
  settings?: Partial<GameSettings>;
}

// Game with timer state (for API responses and components)
export interface GameWithTimer extends GameData {
  // Timer state from TimerManager
  timeRemaining: number;
  isRunning: boolean;
  isExpired: boolean;
  
  // Computed properties
  isGameFinished: boolean;
}

// Timer persistence data (minimal data for timer reconstruction)
export interface TimerPersistenceData {
  gameId: string;
  isRunning: boolean;
  startedAt: Date | null;
  pausedAt: Date | null;
  totalPausedTime: number; // in seconds
  currentQuarter: number;
  quarterLength: number; // in seconds
  status: 'scheduled' | 'live' | 'finished';
  createdAt: Date;
  updatedAt: Date;
}

// For migration compatibility - maps old Game interface to new models
export interface LegacyGame {
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

// Utility functions for data transformation
export class GameDataTransformer {
  /**
   * Convert legacy game to new data models
   */
  static fromLegacyGame(legacyGame: LegacyGame): {
    gameData: GameData;
    timerData: TimerPersistenceData;
  } {
    const gameData: GameData = {
      id: legacyGame.id,
      teamA: legacyGame.teamA,
      teamB: legacyGame.teamB,
      scoreA: legacyGame.scoreA,
      scoreB: legacyGame.scoreB,
      currentQuarter: legacyGame.currentQuarter,
      status: legacyGame.status === 'break' ? 'scheduled' : legacyGame.status,
      settings: {
        quarterLength: legacyGame.quarterLength,
        breakLength: DEFAULT_GAME_SETTINGS.breakLength,
        totalQuarters: DEFAULT_GAME_SETTINGS.totalQuarters,
      },
      createdAt: legacyGame.createdAt,
      updatedAt: legacyGame.updatedAt,
    };

    // Calculate timer state from legacy fields
    const timerData: TimerPersistenceData = {
      gameId: legacyGame.id,
      isRunning: legacyGame.isRunning,
      startedAt: legacyGame.timerStartedAt || null,
      pausedAt: legacyGame.isRunning ? null : new Date(),
      totalPausedTime: legacyGame.isRunning ? 0 : 
        Math.max(0, (legacyGame.quarterLength * 60) - legacyGame.timeRemaining),
      currentQuarter: legacyGame.currentQuarter,
      quarterLength: legacyGame.quarterLength * 60, // convert to seconds
      status: legacyGame.status === 'break' ? 'scheduled' : 
        (legacyGame.status === 'live' ? 'live' : 'scheduled'),
      createdAt: legacyGame.createdAt,
      updatedAt: legacyGame.updatedAt,
    };

    return { gameData, timerData };
  }

  /**
   * Convert new data models to legacy format (for backward compatibility)
   */
  static toLegacyGame(
    gameData: GameData, 
    timerData: TimerPersistenceData,
    currentTimeRemaining: number
  ): LegacyGame {
    return {
      id: gameData.id,
      teamA: gameData.teamA,
      teamB: gameData.teamB,
      scoreA: gameData.scoreA,
      scoreB: gameData.scoreB,
      currentQuarter: gameData.currentQuarter,
      timeRemaining: currentTimeRemaining,
      quarterLength: gameData.settings.quarterLength,
      status: gameData.status,
      isRunning: timerData.isRunning,
      timerStartedAt: timerData.startedAt || undefined,
      lastServerTime: currentTimeRemaining,
      createdAt: gameData.createdAt,
      updatedAt: gameData.updatedAt,
    };
  }

  /**
   * Create GameWithTimer from separate data and timer state
   */
  static combineGameWithTimer(
    gameData: GameData,
    timeRemaining: number,
    isRunning: boolean,
    isExpired: boolean
  ): GameWithTimer {
    return {
      ...gameData,
      timeRemaining,
      isRunning,
      isExpired,
      isGameFinished: gameData.status === 'finished',
    };
  }
}
