import { Game, CreateGameRequest, DEFAULT_SETTINGS } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';

// Simple in-memory storage for now (will move to database later)
const games = new Map<string, Game>();

// Global store with enhanced debugging
declare global {
  var globalGameStore: Map<string, Game> | undefined;
}

// Use global storage to persist across serverless function instances
const getGlobalStore = (): Map<string, Game> => {
  if (typeof global !== 'undefined') {
    if (!global.globalGameStore) {
      global.globalGameStore = new Map<string, Game>();
      console.log('Created new global game store');
    }
    return global.globalGameStore;
  }
  return games; // Fallback to local storage
};

// Enhanced logging
const logGameState = (operation: string, gameId?: string) => {
  const store = getGlobalStore();
  console.log(`=== GAME STORAGE ${operation} ===`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'unknown'}`);
  console.log(`Total games in store: ${store.size}`);
  console.log(`Game IDs: [${Array.from(store.keys()).join(', ')}]`);
  if (gameId) {
    console.log(`Requested game ID: ${gameId}`);
    console.log(`Game exists: ${store.has(gameId)}`);
  }
  console.log('=====================================');
};

export class GameStorage {
  static createGame(request: CreateGameRequest): Game {
    const id = uuidv4();
    const settings = { ...DEFAULT_SETTINGS, ...request.settings };
    
    const game: Game = {
      id,
      teamA: request.teamA,
      teamB: request.teamB,
      scoreA: 0,
      scoreB: 0,
      currentQuarter: 1,
      timeRemaining: settings.quarterLength * 60, // convert minutes to seconds
      quarterLength: settings.quarterLength, // store for display
      status: 'scheduled',
      isRunning: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const store = getGlobalStore();
    store.set(id, game);
    logGameState('CREATE_GAME', id);
    return game;
  }

  static getGame(id: string): Game | null {
    const store = getGlobalStore();
    const game = store.get(id) || null;
    logGameState('GET_GAME', id);
    return game;
  }

  static updateGame(id: string, updates: Partial<Game>): Game | null {
    const store = getGlobalStore();
    const game = store.get(id);
    if (!game) {
      logGameState('UPDATE_GAME_FAILED', id);
      return null;
    }

    const updatedGame = {
      ...game,
      ...updates,
      updatedAt: new Date(),
    };

    store.set(id, updatedGame);
    logGameState('UPDATE_GAME', id);
    return updatedGame;
  }

  static getAllGames(): Game[] {
    const store = getGlobalStore();
    return Array.from(store.values());
  }

  static deleteGame(id: string): boolean {
    const store = getGlobalStore();
    const result = store.delete(id);
    logGameState('DELETE_GAME', id);
    return result;
  }

  // Helper methods for scoring
  static addScore(id: string, team: 'A' | 'B', points: number = 1): Game | null {
    const game = this.getGame(id);
    if (!game) return null;

    const updates: Partial<Game> = {};
    if (team === 'A') {
      updates.scoreA = Math.max(0, game.scoreA + points);
    } else {
      updates.scoreB = Math.max(0, game.scoreB + points);
    }

    return this.updateGame(id, updates);
  }

  // Timer management
  static startTimer(id: string): Game | null {
    return this.updateGame(id, { 
      isRunning: true, 
      status: 'live' 
    });
  }

  static pauseTimer(id: string): Game | null {
    return this.updateGame(id, { isRunning: false });
  }

  static nextQuarter(id: string): Game | null {
    const game = this.getGame(id);
    if (!game) return null;

    const nextQuarter = game.currentQuarter + 1;
    const isFinished = nextQuarter > DEFAULT_SETTINGS.totalQuarters;

    return this.updateGame(id, {
      currentQuarter: isFinished ? game.currentQuarter : nextQuarter,
      timeRemaining: isFinished ? 0 : game.quarterLength * 60, // use game's quarter length
      status: isFinished ? 'finished' : 'scheduled',
      isRunning: false,
    });
  }

  static endGame(id: string): Game | null {
    return this.updateGame(id, {
      status: 'finished',
      isRunning: false,
      timeRemaining: 0,
    });
  }
}
