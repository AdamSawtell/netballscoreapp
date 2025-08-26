import { Game, CreateGameRequest, DEFAULT_SETTINGS } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Multiple storage locations for redundancy
const STORAGE_LOCATIONS = [
  path.join('/tmp', 'netball-games.json'),
  path.join(process.cwd(), '.games-cache.json'),
  path.join(__dirname, '../../.games-backup.json')
];

// Try to find the best available storage location
const getStorageFile = (): string => {
  for (const location of STORAGE_LOCATIONS) {
    try {
      // Test if we can write to this location
      const testFile = location + '.test';
      fs.writeFileSync(testFile, '{}');
      fs.unlinkSync(testFile);
      console.log(`Using storage location: ${location}`);
      return location;
    } catch (error) {
      console.log(`Cannot write to ${location}:`, error instanceof Error ? error.message : String(error));
    }
  }
  console.log('WARNING: No writable storage location found, using /tmp as fallback');
  return STORAGE_LOCATIONS[0];
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

// Global in-memory cache as ultimate fallback
declare global {
  var gameStorageCache: Map<string, Game> | undefined;
}

// Load games with multiple fallback strategies
const loadGamesFromStorage = (): Map<string, Game> => {
  const games = new Map<string, Game>();
  
  // Strategy 1: Try to load from file storage
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
      logGameState('LOAD_FROM_FILE', undefined, { 
        count: games.size, 
        gameIds: Array.from(games.keys()),
        file: STORAGE_FILE
      });
      
      // Update global cache
      if (typeof global !== 'undefined') {
        global.gameStorageCache = new Map(games);
      }
      return games;
    }
  } catch (error) {
    logGameState('FILE_LOAD_ERROR', undefined, { 
      error: error instanceof Error ? error.message : String(error),
      file: STORAGE_FILE
    });
  }
  
  // Strategy 2: Fall back to global cache
  if (typeof global !== 'undefined' && global.gameStorageCache) {
    global.gameStorageCache.forEach((game, id) => games.set(id, game));
    logGameState('LOAD_FROM_GLOBAL_CACHE', undefined, { 
      count: games.size, 
      gameIds: Array.from(games.keys()) 
    });
    return games;
  }
  
  // Strategy 3: No games found anywhere
  logGameState('NO_GAMES_FOUND_ANYWHERE', undefined, { 
    fileExists: fs.existsSync(STORAGE_FILE),
    globalCacheExists: !!(typeof global !== 'undefined' && global.gameStorageCache)
  });
  
  return games;
};

// Save games with redundancy
const saveGamesToStorage = (games: Map<string, Game>) => {
  // Always update global cache first (most reliable)
  if (typeof global !== 'undefined') {
    global.gameStorageCache = new Map(games);
    logGameState('SAVE_TO_GLOBAL_CACHE', undefined, { count: games.size });
  }
  
  // Try to save to file storage
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
      globalCacheUpdated: true // Still saved to global cache
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
      lastServerTime: newTimeRemaining,
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
