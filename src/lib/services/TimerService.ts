/**
 * TimerService - Bridge between TimerManager and Storage
 * Phase 2.4: Integration layer for timer and game data
 */

import { TimerManager } from '../timer/TimerManager';
import { TimerState } from '../timer/TimerState';
import { GameDataStorage, TimerDataStorage } from '../storage/GameStorageV2';
import { GameData, GameWithTimer, TimerPersistenceData, GameDataTransformer } from '@/types/game-v2';

/**
 * Service class that coordinates between TimerManager and storage layers
 */
export class TimerService {
  private static timers = new Map<string, TimerManager>();
  private static lastAccessed = new Map<string, number>();
  private static cleanupInterval: NodeJS.Timeout | null = null;
  
  // Memory management constants
  private static readonly TIMER_TTL = 2 * 60 * 60 * 1000; // 2 hours
  private static readonly CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_TIMER_INSTANCES = 100; // Safety limit
  
  // Serverless persistence constants
  private static readonly AUTO_SAVE_INTERVAL = 30 * 1000; // 30 seconds
  private static autoSaveInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize or get existing timer for a game
   */
  /**
   * Initialize automatic cleanup and persistence systems
   */
  private static initializeCleanup(): void {
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.performAutomaticCleanup();
      }, this.CLEANUP_INTERVAL);
      
      console.log('🧹 TimerService: Automatic cleanup initialized');
    }
    
    // Initialize auto-save for serverless environments
    if (!this.autoSaveInterval) {
      this.autoSaveInterval = setInterval(() => {
        this.performAutoSave();
      }, this.AUTO_SAVE_INTERVAL);
      
      console.log('💾 TimerService: Auto-save initialized (30s interval)');
    }
  }

  /**
   * Aggressive auto-save for serverless persistence
   */
  private static performAutoSave(): void {
    if (this.timers.size === 0) return;
    
    try {
      this.saveAllTimerStates();
      console.log(`💾 TimerService: Auto-saved ${this.timers.size} timer states`);
    } catch (error) {
      console.error('🚨 TimerService: Auto-save failed:', error);
    }
  }

  /**
   * Perform automatic cleanup of stale timers
   */
  private static performAutomaticCleanup(): void {
    const now = Date.now();
    const staleTimers: string[] = [];
    
    // Find stale timers based on TTL
    for (const [gameId, lastAccess] of this.lastAccessed.entries()) {
      if (now - lastAccess > this.TIMER_TTL) {
        staleTimers.push(gameId);
      }
    }
    
    // Remove stale timers
    for (const gameId of staleTimers) {
      this.timers.delete(gameId);
      this.lastAccessed.delete(gameId);
      console.log(`🧹 TimerService: Cleaned up stale timer ${gameId}`);
    }
    
    // Safety check: if we have too many instances, clean up the oldest
    if (this.timers.size > this.MAX_TIMER_INSTANCES) {
      const sortedByAccess = Array.from(this.lastAccessed.entries())
        .sort((a, b) => a[1] - b[1]) // Sort by last accessed time
        .slice(0, this.timers.size - this.MAX_TIMER_INSTANCES);
      
      for (const [gameId] of sortedByAccess) {
        this.timers.delete(gameId);
        this.lastAccessed.delete(gameId);
        console.log(`🧹 TimerService: Cleaned up excess timer ${gameId}`);
      }
    }
    
    console.log(`🧹 TimerService: Cleanup complete. Active timers: ${this.timers.size}`);
  }

  private static getOrCreateTimer(gameData: GameData): TimerManager {
    const gameId = gameData.id;
    
    // Initialize cleanup system on first use
    this.initializeCleanup();
    
    // Update access time
    this.lastAccessed.set(gameId, Date.now());
    
    if (this.timers.has(gameId)) {
      return this.timers.get(gameId)!;
    }

    // Load persisted timer state
    const persistedTimer = TimerDataStorage.getTimerState(gameId);
    
    let timer: TimerManager;
    
    if (persistedTimer) {
      // Restore timer from persisted state
      timer = new TimerManager(gameId, {
        quarterLength: persistedTimer.quarterLength,
        totalQuarters: gameData.settings.totalQuarters,
      });
      
      // Sync with persisted state
      timer.syncWithState({
        isRunning: persistedTimer.isRunning,
        startedAt: persistedTimer.startedAt,
        pausedAt: persistedTimer.pausedAt,
        totalPausedTime: persistedTimer.totalPausedTime,
        quarterLength: persistedTimer.quarterLength,
        currentQuarter: persistedTimer.currentQuarter,
        gameId: persistedTimer.gameId,
        status: persistedTimer.status,
      });
      
      console.log(`🔄 Restored timer for game ${gameId} from persistence`);
    } else {
      // Create new timer
      timer = new TimerManager(gameId, {
        quarterLength: gameData.settings.quarterLength * 60, // convert minutes to seconds
        totalQuarters: gameData.settings.totalQuarters,
      });
      
      // Save initial timer state
      this.saveTimerState(gameId, timer.getState());
      console.log(`🆕 Created new timer for game ${gameId}`);
    }

    // Subscribe to timer events for auto-persistence
    timer.subscribe((event) => {
      this.saveTimerState(gameId, event.state);
      
      // Update game data if quarter changed
      if (event.type === 'nextQuarter') {
        GameDataStorage.updateQuarter(gameId, event.state.currentQuarter);
      }
      
      // End game if finished
      if (event.state.status === 'finished') {
        GameDataStorage.endGame(gameId);
      }
    });

    this.timers.set(gameId, timer);
    return timer;
  }

  /**
   * Save timer state to persistence
   */
  private static saveTimerState(gameId: string, timerState: TimerState): void {
    const persistenceData: TimerPersistenceData = {
      gameId: timerState.gameId,
      isRunning: timerState.isRunning,
      startedAt: timerState.startedAt,
      pausedAt: timerState.pausedAt,
      totalPausedTime: timerState.totalPausedTime,
      currentQuarter: timerState.currentQuarter,
      quarterLength: timerState.quarterLength,
      status: timerState.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    TimerDataStorage.saveTimerState(persistenceData);
  }

  /**
   * Get complete game state with timer information
   */
  static getGameWithTimer(gameId: string): GameWithTimer | null {
    const gameData = GameDataStorage.getGame(gameId);
    if (!gameData) {
      return null;
    }

    // Update access time for memory management
    this.lastAccessed.set(gameId, Date.now());

    const timer = this.getOrCreateTimer(gameData);
    const timerState = timer.getState();
    const timeRemaining = timer.getCurrentTime();

    return GameDataTransformer.combineGameWithTimer(
      gameData,
      timeRemaining,
      timerState.isRunning,
      timer.isExpired()
    );
  }

  /**
   * Start timer for a game
   */
  static startTimer(gameId: string): GameWithTimer | null {
    const gameData = GameDataStorage.getGame(gameId);
    if (!gameData) {
      return null;
    }

    const timer = this.getOrCreateTimer(gameData);
    timer.start();

    // Update game status if needed
    if (gameData.status !== 'live') {
      GameDataStorage.updateGame(gameId, { status: 'live' });
    }

    return this.getGameWithTimer(gameId);
  }

  /**
   * Pause timer for a game
   */
  static pauseTimer(gameId: string): GameWithTimer | null {
    const gameData = GameDataStorage.getGame(gameId);
    if (!gameData) {
      return null;
    }

    const timer = this.getOrCreateTimer(gameData);
    timer.pause();

    // Update game status if needed
    if (gameData.status !== 'scheduled') {
      GameDataStorage.updateGame(gameId, { status: 'scheduled' });
    }

    return this.getGameWithTimer(gameId);
  }

  /**
   * Move to next quarter
   */
  static nextQuarter(gameId: string): GameWithTimer | null {
    const gameData = GameDataStorage.getGame(gameId);
    if (!gameData) {
      return null;
    }

    const timer = this.getOrCreateTimer(gameData);
    timer.nextQuarter();

    return this.getGameWithTimer(gameId);
  }

  /**
   * Reset timer to start of current quarter
   */
  static resetTimer(gameId: string): GameWithTimer | null {
    const gameData = GameDataStorage.getGame(gameId);
    if (!gameData) {
      return null;
    }

    const timer = this.getOrCreateTimer(gameData);
    timer.reset();

    return this.getGameWithTimer(gameId);
  }

  /**
   * Update score (pure game data operation)
   */
  static updateScore(gameId: string, team: 'A' | 'B', points: number): GameWithTimer | null {
    // Update game data (no timer involvement)
    const updatedGameData = GameDataStorage.updateScore(gameId, team, points);
    if (!updatedGameData) {
      return null;
    }

    // Return combined state
    return this.getGameWithTimer(gameId);
  }

  /**
   * Create new game with timer
   */
  static createGame(teamA: string, teamB: string, settings?: Record<string, unknown>): GameWithTimer {
    const gameData = GameDataStorage.createGame({
      teamA,
      teamB,
      settings,
    });

    // Timer will be created on first access
    return this.getGameWithTimer(gameData.id)!;
  }

  /**
   * Delete game and associated timer
   */
  static deleteGame(gameId: string): boolean {
    // Clean up timer
    if (this.timers.has(gameId)) {
      this.timers.delete(gameId);
    }

    // Delete timer persistence data
    TimerDataStorage.deleteTimerState(gameId);

    // Delete game data
    return GameDataStorage.deleteGame(gameId);
  }

  /**
   * Get all games with timer information
   */
  static getAllGamesWithTimer(): GameWithTimer[] {
    const allGameData = GameDataStorage.getAllGames();
    return allGameData.map(gameData => this.getGameWithTimer(gameData.id)!);
  }

  /**
   * Sync timer with external state (for server synchronization)
   */
  static syncTimer(gameId: string, externalTimerState: Partial<TimerState>): GameWithTimer | null {
    const gameData = GameDataStorage.getGame(gameId);
    if (!gameData) {
      return null;
    }

    const timer = this.getOrCreateTimer(gameData);
    timer.syncWithState(externalTimerState);

    return this.getGameWithTimer(gameId);
  }

  /**
   * Clean up inactive timers (memory management)
   */
  static cleanupInactiveTimers(): void {
    const activeGames = new Set(GameDataStorage.getAllGames().map(g => g.id));
    
    for (const [gameId, timer] of this.timers.entries()) {
      if (!activeGames.has(gameId)) {
        console.log(`🧹 Cleaning up timer for deleted game ${gameId}`);
        this.timers.delete(gameId);
      }
    }
  }

  /**
   * Get timer state for debugging
   */
  static getTimerState(gameId: string): TimerState | null {
    if (!this.timers.has(gameId)) {
      const gameData = GameDataStorage.getGame(gameId);
      if (!gameData) return null;
      this.getOrCreateTimer(gameData);
    }

          return this.timers.get(gameId)?.getState() || null;
  }

  /**
   * Force save all timer states (useful for graceful shutdown)
   */
  static saveAllTimerStates(): void {
    for (const [gameId, timer] of this.timers.entries()) {
      this.saveTimerState(gameId, timer.getState());
    }
    console.log(`💾 Saved ${this.timers.size} timer states`);
  }

  /**
   * Graceful shutdown - save all states and cleanup
   */
  static shutdown(): void {
    console.log('🔄 TimerService: Starting graceful shutdown...');
    
    // Save all timer states
    this.saveAllTimerStates();
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clear auto-save interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    // Clear all timers
    this.timers.clear();
    this.lastAccessed.clear();
    
    console.log('✅ TimerService: Graceful shutdown complete');
  }

  /**
   * Get memory usage statistics
   */
  static getMemoryStats(): {
    activeTimers: number;
    oldestAccess: string | null;
    newestAccess: string | null;
    memoryPressure: 'low' | 'medium' | 'high';
  } {
    const now = Date.now();
    const accessTimes = Array.from(this.lastAccessed.values());
    
    const oldestAccess = accessTimes.length > 0 
      ? new Date(Math.min(...accessTimes)).toISOString()
      : null;
    const newestAccess = accessTimes.length > 0
      ? new Date(Math.max(...accessTimes)).toISOString() 
      : null;
    
    let memoryPressure: 'low' | 'medium' | 'high' = 'low';
    if (this.timers.size > this.MAX_TIMER_INSTANCES * 0.8) {
      memoryPressure = 'high';
    } else if (this.timers.size > this.MAX_TIMER_INSTANCES * 0.5) {
      memoryPressure = 'medium';
    }
    
    return {
      activeTimers: this.timers.size,
      oldestAccess,
      newestAccess,
      memoryPressure
    };
  }
}
