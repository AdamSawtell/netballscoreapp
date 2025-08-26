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
    logGameState('GET_GAME', id, { found: !!game, totalGames: games.size });
    return game;
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
