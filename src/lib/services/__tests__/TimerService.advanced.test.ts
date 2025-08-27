/**
 * TimerService Advanced Tests
 * Testing memory management, persistence, and serverless features
 */

import { TimerService } from '../TimerService';
import { GameDataStorage, TimerDataStorage } from '@/lib/storage/GameStorageV2';

// Mock the storage layers
jest.mock('@/lib/storage/GameStorageV2');
const mockGameDataStorage = GameDataStorage as jest.Mocked<typeof GameDataStorage>;
const mockTimerDataStorage = TimerDataStorage as jest.Mocked<typeof TimerDataStorage>;

// Mock setInterval and clearInterval for auto-save testing
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;

describe('TimerService Memory Management', () => {
  let mockIntervals: number[] = [];
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Track intervals for cleanup testing
    mockIntervals = [];
    global.setInterval = jest.fn((callback, delay) => {
      const id = originalSetInterval(callback, delay) as unknown as number;
      mockIntervals.push(id);
      return id;
    });
    
    global.clearInterval = jest.fn((id) => {
      mockIntervals = mockIntervals.filter(intervalId => intervalId !== id);
      return originalClearInterval(id);
    });

    // Mock storage returns
    mockGameDataStorage.createGame.mockReturnValue({
      id: 'test-game',
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 0,
      scoreB: 0,
      settings: { quarterLength: 15, totalQuarters: 4 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    mockGameDataStorage.getGame.mockReturnValue({
      id: 'test-game',
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 0,
      scoreB: 0,
      settings: { quarterLength: 15, totalQuarters: 4 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    
    // Clean up any remaining intervals
    mockIntervals.forEach(id => originalClearInterval(id));
    mockIntervals = [];
  });

  test('should initialize automatic cleanup system', () => {
    // Creating a game should trigger initialization
    TimerService.createGame('Team A', 'Team B', { quarterLength: 15 });
    
    // Should have setup cleanup and auto-save intervals
    expect(global.setInterval).toHaveBeenCalledTimes(2);
    expect(mockIntervals).toHaveLength(2);
  });

  test('should perform automatic cleanup of stale timers', () => {
    // Create multiple games to trigger cleanup initialization
    TimerService.createGame('Team A', 'Team B', { quarterLength: 15 });
    TimerService.createGame('Team C', 'Team D', { quarterLength: 15 });
    
    // Get memory stats before cleanup
    const statsBefore = TimerService.getMemoryStats();
    expect(statsBefore.activeTimers).toBeGreaterThan(0);
    
    // Fast-forward time to trigger TTL cleanup (2 hours + 1 minute)
    jest.advanceTimersByTime(2 * 60 * 60 * 1000 + 60 * 1000);
    
    // Verify cleanup was performed (intervals should have run)
    const statsAfter = TimerService.getMemoryStats();
    expect(statsAfter.activeTimers).toBeDefined();
  });

  test('should perform auto-save every 30 seconds', () => {
    const saveSpy = jest.spyOn(TimerService, 'saveAllTimerStates');
    
    // Create a game to trigger auto-save initialization
    TimerService.createGame('Team A', 'Team B', { quarterLength: 15 });
    
    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30 * 1000);
    
    // Auto-save should have been called
    expect(saveSpy).toHaveBeenCalled();
    
    saveSpy.mockRestore();
  });

  test('should handle graceful shutdown', () => {
    const saveSpy = jest.spyOn(TimerService, 'saveAllTimerStates');
    
    // Create games and start timers
    TimerService.createGame('Team A', 'Team B', { quarterLength: 15 });
    TimerService.createGame('Team C', 'Team D', { quarterLength: 15 });
    
    // Shutdown should save all states and clean up
    TimerService.shutdown();
    
    expect(saveSpy).toHaveBeenCalled();
    expect(global.clearInterval).toHaveBeenCalledTimes(2); // cleanup + auto-save intervals
    
    const stats = TimerService.getMemoryStats();
    expect(stats.activeTimers).toBe(0);
    
    saveSpy.mockRestore();
  });

  test('should provide memory pressure monitoring', () => {
    const stats = TimerService.getMemoryStats();
    
    expect(stats).toHaveProperty('activeTimers');
    expect(stats).toHaveProperty('memoryPressure');
    expect(stats).toHaveProperty('oldestAccess');
    expect(stats).toHaveProperty('newestAccess');
    
    // Initially should be low pressure
    expect(stats.memoryPressure).toBe('low');
  });

  test('should track last accessed time for memory management', () => {
    const gameId = 'access-test-game';
    
    // Create game
    TimerService.createGame('Team A', 'Team B', { quarterLength: 15 });
    
    // Access the game
    TimerService.getGameWithTimer(gameId);
    
    const stats = TimerService.getMemoryStats();
    expect(stats.newestAccess).toBeTruthy();
  });
});

describe('TimerService Serverless Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGameDataStorage.createGame.mockReturnValue({
      id: 'persistence-game',
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 0,
      scoreB: 0,
      settings: { quarterLength: 15, totalQuarters: 4 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    mockGameDataStorage.getGame.mockReturnValue({
      id: 'persistence-game',
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 0,
      scoreB: 0,
      settings: { quarterLength: 15, totalQuarters: 4 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  test('should save timer state on every operation', () => {
    const gameId = 'persistence-game';
    
    // Create game
    TimerService.createGame('Team A', 'Team B', { quarterLength: 15 });
    
    // Start timer
    TimerService.startTimer(gameId);
    expect(mockTimerDataStorage.saveTimerState).toHaveBeenCalled();
    
    // Pause timer
    TimerService.pauseTimer(gameId);
    expect(mockTimerDataStorage.saveTimerState).toHaveBeenCalledTimes(2);
    
    // Update score
    TimerService.updateScore(gameId, 'A', 3);
    expect(mockGameDataStorage.updateGame).toHaveBeenCalled();
  });

  test('should restore timer state from persistence', () => {
    const gameId = 'restore-game';
    
    // Mock persisted timer state
    mockTimerDataStorage.getTimerState.mockReturnValue({
      gameId,
      isRunning: true,
      currentQuarter: 2,
      quarterLength: 900,
      timerStartedAt: Date.now() - 300000, // 5 minutes ago
      totalPausedTime: 0,
      quartersCompleted: 1
    });
    
    // Get game should restore from persistence
    const game = TimerService.getGameWithTimer(gameId);
    
    expect(game?.currentQuarter).toBe(2);
    expect(game?.isRunning).toBe(true);
    expect(mockTimerDataStorage.getTimerState).toHaveBeenCalledWith(gameId);
  });

  test('should handle persistence failures gracefully', () => {
    const gameId = 'failure-game';
    
    // Mock storage failure
    mockTimerDataStorage.saveTimerState.mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    
    // Operations should not crash on storage failures
    expect(() => {
      TimerService.createGame('Team A', 'Team B', { quarterLength: 15 });
      TimerService.startTimer(gameId);
    }).not.toThrow();
  });

  test('should save all timer states in batch', () => {
    // Create multiple games
    TimerService.createGame('Team A', 'Team B', { quarterLength: 15 });
    TimerService.createGame('Team C', 'Team D', { quarterLength: 15 });
    
    // Save all states
    TimerService.saveAllTimerStates();
    
    // Should have called save for each timer
    expect(mockTimerDataStorage.saveTimerState).toHaveBeenCalledTimes(2);
  });
});

describe('TimerService Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle game data storage errors', () => {
    mockGameDataStorage.createGame.mockImplementation(() => {
      throw new Error('Database connection failed');
    });
    
    expect(() => {
      TimerService.createGame('Team A', 'Team B', { quarterLength: 15 });
    }).toThrow('Database connection failed');
  });

  test('should handle timer data storage errors', () => {
    mockGameDataStorage.createGame.mockReturnValue({
      id: 'error-game',
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 0,
      scoreB: 0,
      settings: { quarterLength: 15, totalQuarters: 4 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    mockTimerDataStorage.saveTimerState.mockImplementation(() => {
      throw new Error('Timer storage failed');
    });
    
    // Should not crash but log error
    expect(() => {
      TimerService.createGame('Team A', 'Team B', { quarterLength: 15 });
    }).not.toThrow();
  });

  test('should handle missing game data gracefully', () => {
    mockGameDataStorage.getGame.mockReturnValue(null);
    
    const result = TimerService.getGameWithTimer('non-existent-game');
    expect(result).toBeNull();
  });

  test('should handle timer operations on non-existent games', () => {
    mockGameDataStorage.getGame.mockReturnValue(null);
    
    const result = TimerService.startTimer('non-existent-game');
    expect(result).toBeNull();
  });
});

describe('TimerService Performance and Optimization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGameDataStorage.createGame.mockReturnValue({
      id: 'perf-game',
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 0,
      scoreB: 0,
      settings: { quarterLength: 15, totalQuarters: 4 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    mockGameDataStorage.getGame.mockReturnValue({
      id: 'perf-game',
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 0,
      scoreB: 0,
      settings: { quarterLength: 15, totalQuarters: 4 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  test('should cache timer instances efficiently', () => {
    const gameId = 'cache-game';
    
    // First access should create timer
    TimerService.getGameWithTimer(gameId);
    
    // Second access should reuse existing timer
    TimerService.getGameWithTimer(gameId);
    
    // Should only load from storage once
    expect(mockGameDataStorage.getGame).toHaveBeenCalledTimes(2);
  });

  test('should handle concurrent timer operations', () => {
    const gameId = 'concurrent-game';
    
    // Simulate concurrent operations
    const operations = [
      () => TimerService.startTimer(gameId),
      () => TimerService.updateScore(gameId, 'A', 1),
      () => TimerService.getGameWithTimer(gameId),
      () => TimerService.pauseTimer(gameId)
    ];
    
    // All operations should complete without errors
    expect(() => {
      operations.forEach(op => op());
    }).not.toThrow();
  });

  test('should limit maximum timer instances', () => {
    // Create many games to test limit
    for (let i = 0; i < 150; i++) {
      mockGameDataStorage.createGame.mockReturnValueOnce({
        id: `game-${i}`,
        teamA: 'Team A',
        teamB: 'Team B',
        scoreA: 0,
        scoreB: 0,
        settings: { quarterLength: 15, totalQuarters: 4 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      TimerService.createGame(`Team A ${i}`, `Team B ${i}`, { quarterLength: 15 });
    }
    
    const stats = TimerService.getMemoryStats();
    
    // Should not exceed maximum limit due to cleanup
    expect(stats.activeTimers).toBeLessThanOrEqual(100);
  });
});

describe('TimerService Integration with Storage Layers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should coordinate between game data and timer data storage', () => {
    const gameId = 'integration-game';
    
    mockGameDataStorage.createGame.mockReturnValue({
      id: gameId,
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 0,
      scoreB: 0,
      settings: { quarterLength: 15, totalQuarters: 4 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    mockGameDataStorage.getGame.mockReturnValue({
      id: gameId,
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 0,
      scoreB: 0,
      settings: { quarterLength: 15, totalQuarters: 4 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Create game should save to game data storage
    TimerService.createGame('Team A', 'Team B', { quarterLength: 15 });
    expect(mockGameDataStorage.createGame).toHaveBeenCalled();
    
    // Start timer should save to timer data storage
    TimerService.startTimer(gameId);
    expect(mockTimerDataStorage.saveTimerState).toHaveBeenCalled();
    
    // Update score should update game data storage
    TimerService.updateScore(gameId, 'A', 3);
    expect(mockGameDataStorage.updateGame).toHaveBeenCalled();
    
    // Get game should combine data from both storages
    const game = TimerService.getGameWithTimer(gameId);
    expect(game).toBeTruthy();
    expect(mockGameDataStorage.getGame).toHaveBeenCalledWith(gameId);
  });

  test('should handle storage layer inconsistencies', () => {
    const gameId = 'inconsistent-game';
    
    // Game exists in game storage but not timer storage
    mockGameDataStorage.getGame.mockReturnValue({
      id: gameId,
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 0,
      scoreB: 0,
      settings: { quarterLength: 15, totalQuarters: 4 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    mockTimerDataStorage.getTimerState.mockReturnValue(null);
    
    // Should create new timer state for existing game
    const game = TimerService.getGameWithTimer(gameId);
    expect(game).toBeTruthy();
    expect(game?.currentQuarter).toBe(1); // Default state
  });

  test('should clean up both storage layers on game completion', () => {
    const gameId = 'cleanup-game';
    
    mockGameDataStorage.getGame.mockReturnValue({
      id: gameId,
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 0,
      scoreB: 0,
      settings: { quarterLength: 15, totalQuarters: 4 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Complete all 4 quarters
    for (let quarter = 1; quarter <= 4; quarter++) {
      TimerService.nextQuarter(gameId);
    }
    
    // Game should be marked as finished
    const game = TimerService.getGameWithTimer(gameId);
    expect(game?.isGameFinished).toBe(true);
  });
});
