/**
 * GameStorage V2 Tests - Pure storage without timer logic
 * Phase 2.5: Testing clean separation of concerns
 */

import { GameDataStorage, TimerDataStorage } from '../GameStorageV2';
import { TimerPersistenceData } from '@/types/game-v2';
import fs from 'fs';

// Mock fs for testing
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Clear global cache
  if (typeof global !== 'undefined') {
    global.gameDataCache = undefined;
    global.gameDataTimestamp = undefined;
    global.timerDataCache = undefined;
    global.timerDataTimestamp = undefined;
  }
  
  // Default fs behavior
  mockFs.existsSync.mockReturnValue(false);
  mockFs.readFileSync.mockReturnValue('[]');
  mockFs.writeFileSync.mockImplementation(() => {});
});

describe('GameDataStorage', () => {
  describe('Game Creation', () => {
    test('should create game with correct initial state', () => {
      const gameData = GameDataStorage.createGame({
        teamA: 'Warriors',
        teamB: 'Eagles',
        settings: { quarterLength: 12 }
      });

      expect(gameData.teamA).toBe('Warriors');
      expect(gameData.teamB).toBe('Eagles');
      expect(gameData.scoreA).toBe(0);
      expect(gameData.scoreB).toBe(0);
      expect(gameData.currentQuarter).toBe(1);
      expect(gameData.status).toBe('scheduled');
      expect(gameData.settings.quarterLength).toBe(12);
      expect(gameData.settings.totalQuarters).toBe(4); // default
      expect(gameData.id).toBeDefined();
      expect(gameData.createdAt).toBeInstanceOf(Date);
    });

    test('should use default settings when not provided', () => {
      const gameData = GameDataStorage.createGame({
        teamA: 'Team A',
        teamB: 'Team B'
      });

      expect(gameData.settings.quarterLength).toBe(15);
      expect(gameData.settings.totalQuarters).toBe(4);
      expect(gameData.settings.breakLength).toBe(3);
    });

    test('should persist game to storage', () => {
      GameDataStorage.createGame({
        teamA: 'Team A',
        teamB: 'Team B'
      });

      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('Game Retrieval', () => {
    test('should return null for non-existent game', () => {
      const game = GameDataStorage.getGame('non-existent-id');
      expect(game).toBeNull();
    });

    test('should retrieve existing game', () => {
      const createdGame = GameDataStorage.createGame({
        teamA: 'Team A',
        teamB: 'Team B'
      });

      const retrievedGame = GameDataStorage.getGame(createdGame.id);
      expect(retrievedGame).toEqual(createdGame);
    });

    test('should load from file if cache is empty', () => {
      const gameData = {
        id: 'test-id',
        teamA: 'Team A',
        teamB: 'Team B',
        scoreA: 0,
        scoreB: 0,
        currentQuarter: 1,
        status: 'scheduled',
        settings: { quarterLength: 15, breakLength: 3, totalQuarters: 4 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify([gameData]));

      const game = GameDataStorage.getGame('test-id');
      expect(game).toBeTruthy();
      expect(game!.teamA).toBe('Team A');
      expect(game!.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Game Updates', () => {
    test('should update game successfully', () => {
      const createdGame = GameDataStorage.createGame({
        teamA: 'Team A',
        teamB: 'Team B'
      });

      const updatedGame = GameDataStorage.updateGame(createdGame.id, {
        status: 'live',
        currentQuarter: 2
      });

      expect(updatedGame).toBeTruthy();
      expect(updatedGame!.status).toBe('live');
      expect(updatedGame!.currentQuarter).toBe(2);
      expect(updatedGame!.updatedAt.getTime()).toBeGreaterThan(createdGame.updatedAt.getTime());
    });

    test('should return null for non-existent game update', () => {
      const result = GameDataStorage.updateGame('non-existent', { status: 'live' });
      expect(result).toBeNull();
    });

    test('should update score correctly', () => {
      const createdGame = GameDataStorage.createGame({
        teamA: 'Team A',
        teamB: 'Team B'
      });

      const updatedGame = GameDataStorage.updateScore(createdGame.id, 'A', 7);
      expect(updatedGame!.scoreA).toBe(7);
      expect(updatedGame!.scoreB).toBe(0);

      const updatedGame2 = GameDataStorage.updateScore(createdGame.id, 'B', -3);
      expect(updatedGame2!.scoreB).toBe(0); // Should not go below 0
    });
  });

  describe('Game Deletion', () => {
    test('should delete existing game', () => {
      const createdGame = GameDataStorage.createGame({
        teamA: 'Team A',
        teamB: 'Team B'
      });

      const result = GameDataStorage.deleteGame(createdGame.id);
      expect(result).toBe(true);

      const retrievedGame = GameDataStorage.getGame(createdGame.id);
      expect(retrievedGame).toBeNull();
    });

    test('should return false for non-existent game deletion', () => {
      const result = GameDataStorage.deleteGame('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Multiple Games', () => {
    test('should handle multiple games correctly', () => {
      const game1 = GameDataStorage.createGame({
        teamA: 'Team A1',
        teamB: 'Team B1'
      });

      const game2 = GameDataStorage.createGame({
        teamA: 'Team A2',
        teamB: 'Team B2'
      });

      const allGames = GameDataStorage.getAllGames();
      expect(allGames).toHaveLength(2);
      expect(allGames.some(g => g.id === game1.id)).toBe(true);
      expect(allGames.some(g => g.id === game2.id)).toBe(true);
    });
  });
});

describe('TimerDataStorage', () => {
  const createMockTimerData = (gameId: string): TimerPersistenceData => ({
    gameId,
    isRunning: false,
    startedAt: null,
    pausedAt: new Date(),
    totalPausedTime: 0,
    currentQuarter: 1,
    quarterLength: 900, // 15 minutes in seconds
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  describe('Timer State Persistence', () => {
    test('should save timer state', () => {
      const timerData = createMockTimerData('game-1');
      
      TimerDataStorage.saveTimerState(timerData);
      
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    test('should retrieve timer state', () => {
      const timerData = createMockTimerData('game-1');
      TimerDataStorage.saveTimerState(timerData);

      const retrieved = TimerDataStorage.getTimerState('game-1');
      expect(retrieved).toBeTruthy();
      expect(retrieved!.gameId).toBe('game-1');
      expect(retrieved!.quarterLength).toBe(900);
    });

    test('should return null for non-existent timer', () => {
      const result = TimerDataStorage.getTimerState('non-existent');
      expect(result).toBeNull();
    });

    test('should delete timer state', () => {
      const timerData = createMockTimerData('game-1');
      TimerDataStorage.saveTimerState(timerData);

      const deleteResult = TimerDataStorage.deleteTimerState('game-1');
      expect(deleteResult).toBe(true);

      const retrieved = TimerDataStorage.getTimerState('game-1');
      expect(retrieved).toBeNull();
    });

    test('should load timer data from file', () => {
      const timerData = {
        gameId: 'game-from-file',
        isRunning: true,
        startedAt: new Date().toISOString(),
        pausedAt: null,
        totalPausedTime: 300,
        currentQuarter: 2,
        quarterLength: 900,
        status: 'live',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify([timerData]));

      const retrieved = TimerDataStorage.getTimerState('game-from-file');
      expect(retrieved).toBeTruthy();
      expect(retrieved!.isRunning).toBe(true);
      expect(retrieved!.currentQuarter).toBe(2);
      expect(retrieved!.startedAt).toBeInstanceOf(Date);
    });
  });

  describe('Multiple Timer States', () => {
    test('should handle multiple timer states', () => {
      const timer1 = createMockTimerData('game-1');
      const timer2 = createMockTimerData('game-2');

      TimerDataStorage.saveTimerState(timer1);
      TimerDataStorage.saveTimerState(timer2);

      const allTimers = TimerDataStorage.getAllTimerStates();
      expect(allTimers).toHaveLength(2);
      expect(allTimers.some(t => t.gameId === 'game-1')).toBe(true);
      expect(allTimers.some(t => t.gameId === 'game-2')).toBe(true);
    });
  });
});

describe('Cache Management', () => {
  test('should use global cache when fresh', () => {
    const gameData = GameDataStorage.createGame({
      teamA: 'Team A',
      teamB: 'Team B'
    });

    // Clear file system mock calls from creation
    jest.clearAllMocks();

    // Second access should use cache
    const retrieved = GameDataStorage.getGame(gameData.id);
    expect(retrieved).toEqual(gameData);
    expect(mockFs.readFileSync).not.toHaveBeenCalled();
  });

  test('should refresh stale cache', () => {
    const gameData = GameDataStorage.createGame({
      teamA: 'Team A',
      teamB: 'Team B'
    });

    // Manually age the cache
    if (global.gameDataTimestamp) {
      global.gameDataTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
    }

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify([gameData]));

    const retrieved = GameDataStorage.getGame(gameData.id);
    expect(retrieved).toBeTruthy();
    expect(mockFs.readFileSync).toHaveBeenCalled(); // Should read from file
  });
});
