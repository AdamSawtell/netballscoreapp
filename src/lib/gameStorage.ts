import { Game, CreateGameRequest, DEFAULT_SETTINGS } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Serverless-friendly storage approach
// Priority: Environment variable cache > Global cache > In-memory fallback
const CACHE_KEY = 'NETBALL_GAMES_CACHE';

// Get storage location with serverless compatibility
const getStorageFile = (): string => {
  // In production/serverless environments, prioritize persistent solutions
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // For serverless, we'll rely on environment variable persistence and global cache
    return '/tmp/netball-games.json'; // Still try, but expect it to fail
  }
  
  // Local development - use project directory
  const localFile = path.join(process.cwd(), '.games-cache.json');
  try {
    const testFile = localFile + '.test';
    fs.writeFileSync(testFile, '{}');
    fs.unlinkSync(testFile);
    console.log(`Using local storage: ${localFile}`);
    return localFile;
  } catch {
    console.log(`Cannot write to ${localFile}, using tmp`);
    return '/tmp/netball-games.json';
  }
};

const STORAGE_FILE = getStorageFile();

// Enhanced logging
const logGameState = (operation: string, gameId?: string, additional?: Record<string, unknown>) => {
  console.log(`=== GAME STORAGE ${operation} ===`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'unknown'}`);
  console.log(`Storage file: ${STORAGE_FILE}`);
  if (gameId) {
    console.log(`Game ID: ${gameId}`);
  }
  if (additional) {
    console.log(`Additional info:`, additional);
  }
  console.log('=====================================');
};

// Enhanced global cache with better persistence
declare global {
  var gameStorageCache: Map<string, Game> | undefined;
  var gameStorageTimestamp: number | undefined;
}

// Cache timeout (5 minutes) for refreshing stale data
const CACHE_TIMEOUT = 5 * 60 * 1000;

// Load games with multiple fallback strategies optimized for serverless
const loadGamesFromStorage = (): Map<string, Game> => {
  const games = new Map<string, Game>();
  const now = Date.now();
  
  // Strategy 1: Check global cache first (fastest in serverless)
  if (typeof global !== 'undefined' && global.gameStorageCache && global.gameStorageTimestamp) {
    const cacheAge = now - global.gameStorageTimestamp;
    if (cacheAge < CACHE_TIMEOUT) {
      global.gameStorageCache.forEach((game, id) => games.set(id, game));
      logGameState('LOAD_FROM_GLOBAL_CACHE_FRESH', undefined, { 
        count: games.size, 
        gameIds: Array.from(games.keys()),
        cacheAge: Math.round(cacheAge / 1000) + 's'
      });
      return games;
    } else {
      logGameState('GLOBAL_CACHE_STALE', undefined, { 
        cacheAge: Math.round(cacheAge / 1000) + 's',
        timeout: CACHE_TIMEOUT / 1000 + 's'
      });
    }
  }
  
  // Strategy 2: Try to load from file storage
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const gameArray = JSON.parse(data) as Game[];
      gameArray.forEach(game => {
        // Convert date strings back to Date objects
        game.createdAt = new Date(game.createdAt);
        game.updatedAt = new Date(game.updatedAt);
        if (game.timerStartedAt) {
          game.timerStartedAt = new Date(game.timerStartedAt);
        }
        games.set(game.id, game);
      });
      
      // Update global cache with fresh data
      if (typeof global !== 'undefined') {
        global.gameStorageCache = new Map(games);
        global.gameStorageTimestamp = now;
      }
      
      logGameState('LOAD_FROM_FILE', undefined, { 
        count: games.size, 
        gameIds: Array.from(games.keys()),
        file: STORAGE_FILE
      });
      return games;
    }
  } catch (error) {
    logGameState('FILE_LOAD_ERROR', undefined, { 
      error: error instanceof Error ? error.message : String(error),
      file: STORAGE_FILE
    });
  }
  
  // Strategy 3: Use stale global cache if available (better than nothing)
  if (typeof global !== 'undefined' && global.gameStorageCache) {
    global.gameStorageCache.forEach((game, id) => games.set(id, game));
    logGameState('LOAD_FROM_GLOBAL_CACHE_STALE', undefined, { 
      count: games.size, 
      gameIds: Array.from(games.keys()),
      note: 'Using stale cache as fallback'
    });
    return games;
  }
  
  // Strategy 4: No games found anywhere
  logGameState('NO_GAMES_FOUND_ANYWHERE', undefined, { 
    fileExists: fs.existsSync(STORAGE_FILE),
    globalCacheExists: !!(typeof global !== 'undefined' && global.gameStorageCache),
    environment: process.env.NODE_ENV || 'unknown'
  });
  
  return games;
};

// Save games with redundancy and timestamp tracking
const saveGamesToStorage = (games: Map<string, Game>) => {
  const now = Date.now();
  
  // Always update global cache first (most reliable in serverless)
  if (typeof global !== 'undefined') {
    global.gameStorageCache = new Map(games);
    global.gameStorageTimestamp = now;
    logGameState('SAVE_TO_GLOBAL_CACHE', undefined, { 
      count: games.size,
      timestamp: new Date(now).toISOString()
    });
  }
  
  // Try to save to file storage (may fail in serverless, but try anyway)
  try {
    const gameArray = Array.from(games.values());
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(gameArray, null, 2));
    logGameState('SAVE_TO_FILE', undefined, { 
      count: games.size, 
      fileExists: fs.existsSync(STORAGE_FILE),
      file: STORAGE_FILE
    });
  } catch (error) {
    logGameState('FILE_SAVE_ERROR', undefined, { 
      error: error instanceof Error ? error.message : String(error),
      file: STORAGE_FILE,
      globalCacheUpdated: true, // Still saved to global cache
      environment: process.env.NODE_ENV || 'unknown'
    });
  }
};

export class GameStorage {
  // Calculate server-side time remaining based on when timer started
  static calculateServerTime(game: Game): Game {
    if (!game.isRunning || !game.timerStartedAt || game.status !== 'live') {
      return game;
    }

    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - game.timerStartedAt.getTime()) / 1000);
    const newTimeRemaining = Math.max(0, game.timeRemaining - elapsedSeconds);

    // If time has run out, stop the timer and save state immediately
    if (newTimeRemaining <= 0) {
      const expiredGame = {
        ...game,
        timeRemaining: 0,
        lastServerTime: 0,
        isRunning: false,
        status: 'scheduled' as const,
        timerStartedAt: undefined, // Clear timer start time
        updatedAt: new Date()
      };
      
      // Persist the stopped state immediately
      const games = loadGamesFromStorage();
      games.set(game.id, expiredGame);
      saveGamesToStorage(games);
      logGameState('TIMER_EXPIRED', game.id, { quarter: game.currentQuarter });
      
      return expiredGame;
    }

    return {
      ...game,
      timeRemaining: newTimeRemaining, // Update actual timeRemaining for consistency
      lastServerTime: newTimeRemaining, // Keep for debugging/tracking
      updatedAt: new Date()
    };
  }
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

    const games = loadGamesFromStorage();
    games.set(id, game);
    saveGamesToStorage(games);
    logGameState('CREATE_GAME', id);
    return game;
  }

  static getGame(id: string): Game | null {
    const games = loadGamesFromStorage();
    const game = games.get(id) || null;
    if (!game) {
      logGameState('GET_GAME', id, { found: false, totalGames: games.size });
      return null;
    }

    // Calculate current server time and update if needed
    const updatedGame = this.calculateServerTime(game);
    
    // If the game state changed (timer expired), save it
    if (updatedGame.timeRemaining !== game.timeRemaining || updatedGame.isRunning !== game.isRunning) {
      games.set(id, updatedGame);
      saveGamesToStorage(games);
      logGameState('GET_GAME_AUTO_UPDATE', id, { 
        timeRemaining: updatedGame.timeRemaining, 
        isRunning: updatedGame.isRunning 
      });
    }

    logGameState('GET_GAME', id, { 
      found: true, 
      totalGames: games.size, 
      timeRemaining: updatedGame.lastServerTime || updatedGame.timeRemaining,
      isRunning: updatedGame.isRunning 
    });
    return updatedGame;
  }

  static updateGame(id: string, updates: Partial<Game>): Game | null {
    const games = loadGamesFromStorage();
    const game = games.get(id);
    if (!game) {
      logGameState('UPDATE_GAME_FAILED', id, { totalGames: games.size });
      return null;
    }

    const updatedGame = {
      ...game,
      ...updates,
      updatedAt: new Date(),
    };

    games.set(id, updatedGame);
    saveGamesToStorage(games);
    logGameState('UPDATE_GAME', id);
    return updatedGame;
  }

  static getAllGames(): Game[] {
    const games = loadGamesFromStorage();
    return Array.from(games.values());
  }

  static deleteGame(id: string): boolean {
    const games = loadGamesFromStorage();
    const result = games.delete(id);
    saveGamesToStorage(games);
    logGameState('DELETE_GAME', id, { result });
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
    const game = this.getGame(id);
    if (!game) return null;

    return this.updateGame(id, { 
      isRunning: true, 
      status: 'live',
      timerStartedAt: new Date(),
      timeRemaining: game.timeRemaining // Preserve current time when starting
    });
  }

  static pauseTimer(id: string): Game | null {
    const game = this.getGame(id);
    if (!game) return null;

    // Calculate current time before pausing
    const updatedGame = this.calculateServerTime(game);
    
    return this.updateGame(id, { 
      isRunning: false,
      timeRemaining: updatedGame.lastServerTime || updatedGame.timeRemaining,
      timerStartedAt: undefined // Clear timer start time
    });
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
      timerStartedAt: undefined, // Clear any previous timer start time
      lastServerTime: undefined, // Clear server time cache
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
