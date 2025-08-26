import { Game, CreateGameRequest, DEFAULT_SETTINGS } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Persistent storage file in Lambda's writable /tmp directory
const STORAGE_FILE = path.join('/tmp', 'netball-games.json');

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

// Load games from persistent storage
const loadGamesFromStorage = (): Map<string, Game> => {
  const games = new Map<string, Game>();
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const gameArray = JSON.parse(data) as Game[];
      gameArray.forEach(game => {
        // Convert date strings back to Date objects
        game.createdAt = new Date(game.createdAt);
        game.updatedAt = new Date(game.updatedAt);
        games.set(game.id, game);
      });
      logGameState('LOAD_FROM_STORAGE', undefined, { count: games.size, gameIds: Array.from(games.keys()) });
    } else {
      logGameState('NO_STORAGE_FILE_FOUND');
    }
  } catch (error) {
    logGameState('LOAD_ERROR', undefined, { error: error instanceof Error ? error.message : String(error) });
  }
  return games;
};

// Save games to persistent storage
const saveGamesToStorage = (games: Map<string, Game>) => {
  try {
    const gameArray = Array.from(games.values());
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(gameArray, null, 2));
    logGameState('SAVE_TO_STORAGE', undefined, { count: games.size, fileExists: fs.existsSync(STORAGE_FILE) });
  } catch (error) {
    logGameState('SAVE_ERROR', undefined, { error: error instanceof Error ? error.message : String(error) });
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

    // If time has run out, stop the timer
    if (newTimeRemaining <= 0) {
      return {
        ...game,
        timeRemaining: 0,
        lastServerTime: 0,
        isRunning: false,
        status: 'scheduled',
        updatedAt: new Date()
      };
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
