/**
 * GameStorage V2 - Pure game data storage without timer logic
 * Phase 2.3: Clean separation of concerns
 */

import { GameData, CreateGameRequest, DEFAULT_GAME_SETTINGS, TimerPersistenceData } from '@/types/game-v2';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Storage configuration
interface StorageConfig {
  gameDataFile: string;
  timerDataFile: string;
  cacheTimeout: number; // in milliseconds
}

// Default storage paths
const getStorageConfig = (): StorageConfig => {
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.VERCEL || 
                      process.env.AWS_LAMBDA_FUNCTION_NAME;
  
  if (isProduction) {
    return {
      gameDataFile: '/tmp/netball-games-data.json',
      timerDataFile: '/tmp/netball-timer-data.json',
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
    };
  }

  // Local development
  return {
    gameDataFile: path.join(process.cwd(), '.games-data-cache.json'),
    timerDataFile: path.join(process.cwd(), '.timer-data-cache.json'),
    cacheTimeout: 5 * 60 * 1000,
  };
};

const STORAGE_CONFIG = getStorageConfig();

// Enhanced logging for debugging
const logStorageOperation = (
  operation: string, 
  type: 'game' | 'timer', 
  gameId?: string, 
  additional?: Record<string, unknown>
) => {
  console.log(`=== STORAGE V2 ${operation.toUpperCase()} (${type.toUpperCase()}) ===`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'unknown'}`);
  if (gameId) console.log(`Game ID: ${gameId}`);
  if (additional) console.log(`Details:`, additional);
  console.log('='.repeat(50));
};

// Global cache declarations
declare global {
  var gameDataCache: Map<string, GameData> | undefined;
  var gameDataTimestamp: number | undefined;
  var timerDataCache: Map<string, TimerPersistenceData> | undefined;
  var timerDataTimestamp: number | undefined;
}

/**
 * Pure Game Data Storage - No timer logic
 */
export class GameDataStorage {
  private static loadFromFile(filePath: string): unknown[] {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      logStorageOperation('load_file_error', 'game', undefined, {
        filePath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    return [];
  }

  private static saveToFile(filePath: string, data: unknown[]): void {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      logStorageOperation('save_file_success', 'game', undefined, {
        filePath,
        count: data.length
      });
    } catch (error) {
      logStorageOperation('save_file_error', 'game', undefined, {
        filePath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private static loadGamesFromStorage(): Map<string, GameData> {
    const games = new Map<string, GameData>();
    const now = Date.now();

    // Check global cache first
    if (global.gameDataCache && global.gameDataTimestamp) {
      const cacheAge = now - global.gameDataTimestamp;
      if (cacheAge < STORAGE_CONFIG.cacheTimeout) {
        global.gameDataCache.forEach((game, id) => games.set(id, game));
        logStorageOperation('load_from_cache', 'game', undefined, {
          count: games.size,
          cacheAge: Math.round(cacheAge / 1000) + 's'
        });
        return games;
      }
    }

    // Load from file
    const gameArray = this.loadFromFile(STORAGE_CONFIG.gameDataFile);
    gameArray.forEach((item: unknown) => {
      const gameData = item as Record<string, unknown>;
      // Convert date strings back to Date objects
      gameData.createdAt = new Date(gameData.createdAt as string);
      gameData.updatedAt = new Date(gameData.updatedAt as string);
      games.set(gameData.id as string, gameData as unknown as GameData);
    });

    // Update global cache
    global.gameDataCache = new Map(games);
    global.gameDataTimestamp = now;

    logStorageOperation('load_from_file', 'game', undefined, {
      count: games.size,
      file: STORAGE_CONFIG.gameDataFile
    });

    return games;
  }

  private static saveGamesToStorage(games: Map<string, GameData>): void {
    const now = Date.now();

    // Update global cache
    global.gameDataCache = new Map(games);
    global.gameDataTimestamp = now;

    // Save to file
    const gameArray = Array.from(games.values());
    this.saveToFile(STORAGE_CONFIG.gameDataFile, gameArray);

    logStorageOperation('save_complete', 'game', undefined, {
      count: games.size
    });
  }

  /**
   * Create a new game with only game data (no timer state)
   */
  static createGame(request: CreateGameRequest): GameData {
    const id = uuidv4();
    const settings = { ...DEFAULT_GAME_SETTINGS, ...request.settings };
    
    const gameData: GameData = {
      id,
      teamA: request.teamA,
      teamB: request.teamB,
      scoreA: 0,
      scoreB: 0,
      currentQuarter: 1,
      status: 'scheduled',
      settings,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const games = this.loadGamesFromStorage();
    games.set(id, gameData);
    this.saveGamesToStorage(games);
    
    logStorageOperation('create_game', 'game', id);
    return gameData;
  }

  /**
   * Get game data by ID (pure data, no timer calculations)
   */
  static getGame(id: string): GameData | null {
    const games = this.loadGamesFromStorage();
    const game = games.get(id) || null;
    
    logStorageOperation('get_game', 'game', id, {
      found: !!game,
      totalGames: games.size
    });
    
    return game;
  }

  /**
   * Update game data (pure update, no side effects)
   */
  static updateGame(id: string, updates: Partial<Omit<GameData, 'id' | 'createdAt'>>): GameData | null {
    const games = this.loadGamesFromStorage();
    const game = games.get(id);
    
    if (!game) {
      logStorageOperation('update_game_not_found', 'game', id);
      return null;
    }

    const updatedGame: GameData = {
      ...game,
      ...updates,
      updatedAt: new Date(),
    };

    games.set(id, updatedGame);
    this.saveGamesToStorage(games);
    
    logStorageOperation('update_game', 'game', id, {
      updatedFields: Object.keys(updates)
    });
    
    return updatedGame;
  }

  /**
   * Update score for a team
   */
  static updateScore(id: string, team: 'A' | 'B', points: number): GameData | null {
    const games = this.loadGamesFromStorage();
    const game = games.get(id);
    
    if (!game) {
      logStorageOperation('update_score_not_found', 'game', id);
      return null;
    }

    const updates: Partial<GameData> = {};
    if (team === 'A') {
      updates.scoreA = Math.max(0, game.scoreA + points);
    } else {
      updates.scoreB = Math.max(0, game.scoreB + points);
    }

    const updatedGame = {
      ...game,
      ...updates,
      updatedAt: new Date(),
    };

    games.set(id, updatedGame);
    this.saveGamesToStorage(games);
    
    logStorageOperation('update_score', 'game', id, {
      team,
      points,
      newScore: team === 'A' ? updatedGame.scoreA : updatedGame.scoreB
    });
    
    return updatedGame;
  }

  /**
   * Get all games
   */
  static getAllGames(): GameData[] {
    const games = this.loadGamesFromStorage();
    return Array.from(games.values());
  }

  /**
   * Delete a game
   */
  static deleteGame(id: string): boolean {
    const games = this.loadGamesFromStorage();
    const result = games.delete(id);
    
    if (result) {
      this.saveGamesToStorage(games);
      logStorageOperation('delete_game', 'game', id, { success: true });
    } else {
      logStorageOperation('delete_game_not_found', 'game', id);
    }
    
    return result;
  }

  /**
   * Update game quarter (separate from timer logic)
   */
  static updateQuarter(id: string, quarter: number): GameData | null {
    return this.updateGame(id, { currentQuarter: quarter });
  }

  /**
   * End game (set status to finished)
   */
  static endGame(id: string): GameData | null {
    return this.updateGame(id, { status: 'finished' });
  }
}

/**
 * Timer Data Storage - Separate from game data
 */
export class TimerDataStorage {
  private static loadFromFile(): unknown[] {
    return GameDataStorage['loadFromFile'](STORAGE_CONFIG.timerDataFile);
  }

  private static saveToFile(data: unknown[]): void {
    GameDataStorage['saveToFile'](STORAGE_CONFIG.timerDataFile, data);
  }

  private static loadTimersFromStorage(): Map<string, TimerPersistenceData> {
    const timers = new Map<string, TimerPersistenceData>();
    const now = Date.now();

    // Check global cache first
    if (global.timerDataCache && global.timerDataTimestamp) {
      const cacheAge = now - global.timerDataTimestamp;
      if (cacheAge < STORAGE_CONFIG.cacheTimeout) {
        global.timerDataCache.forEach((timer, id) => timers.set(id, timer));
        logStorageOperation('load_from_cache', 'timer', undefined, {
          count: timers.size,
          cacheAge: Math.round(cacheAge / 1000) + 's'
        });
        return timers;
      }
    }

    // Load from file
    const timerArray = this.loadFromFile();
    timerArray.forEach((item: unknown) => {
      const timerData = item as Record<string, unknown>;
      // Convert date strings back to Date objects
      timerData.createdAt = new Date(timerData.createdAt as string);
      timerData.updatedAt = new Date(timerData.updatedAt as string);
      if (timerData.startedAt) {
        timerData.startedAt = new Date(timerData.startedAt as string);
      }
      if (timerData.pausedAt) {
        timerData.pausedAt = new Date(timerData.pausedAt as string);
      }
      timers.set(timerData.gameId as string, timerData as unknown as TimerPersistenceData);
    });

    // Update global cache
    global.timerDataCache = new Map(timers);
    global.timerDataTimestamp = now;

    logStorageOperation('load_from_file', 'timer', undefined, {
      count: timers.size,
      file: STORAGE_CONFIG.timerDataFile
    });

    return timers;
  }

  private static saveTimersToStorage(timers: Map<string, TimerPersistenceData>): void {
    const now = Date.now();

    // Update global cache
    global.timerDataCache = new Map(timers);
    global.timerDataTimestamp = now;

    // Save to file
    const timerArray = Array.from(timers.values());
    this.saveToFile(timerArray);

    logStorageOperation('save_complete', 'timer', undefined, {
      count: timers.size
    });
  }

  /**
   * Save timer state for a game
   */
  static saveTimerState(timerData: TimerPersistenceData): void {
    const timers = this.loadTimersFromStorage();
    timers.set(timerData.gameId, {
      ...timerData,
      updatedAt: new Date()
    });
    this.saveTimersToStorage(timers);
    
    logStorageOperation('save_timer_state', 'timer', timerData.gameId, {
      isRunning: timerData.isRunning,
      currentQuarter: timerData.currentQuarter
    });
  }

  /**
   * Load timer state for a game
   */
  static getTimerState(gameId: string): TimerPersistenceData | null {
    const timers = this.loadTimersFromStorage();
    const timerData = timers.get(gameId) || null;
    
    logStorageOperation('get_timer_state', 'timer', gameId, {
      found: !!timerData
    });
    
    return timerData;
  }

  /**
   * Delete timer state for a game
   */
  static deleteTimerState(gameId: string): boolean {
    const timers = this.loadTimersFromStorage();
    const result = timers.delete(gameId);
    
    if (result) {
      this.saveTimersToStorage(timers);
      logStorageOperation('delete_timer_state', 'timer', gameId, { success: true });
    }
    
    return result;
  }

  /**
   * Get all timer states
   */
  static getAllTimerStates(): TimerPersistenceData[] {
    const timers = this.loadTimersFromStorage();
    return Array.from(timers.values());
  }
}
