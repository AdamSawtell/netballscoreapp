/**
 * TimerService Integration Tests
 * Phase 2.5: Testing the bridge between timer and storage
 */

import { TimerService } from '../TimerService';
import { GameDataStorage, TimerDataStorage } from '../../storage/GameStorageV2';
import { GameData, TimerPersistenceData } from '@/types/game-v2';

// Mock the storage layers
jest.mock('../../storage/GameStorageV2');
jest.mock('fs');

const mockGameDataStorage = GameDataStorage as jest.Mocked<typeof GameDataStorage>;
const mockTimerDataStorage = TimerDataStorage as jest.Mocked<typeof TimerDataStorage>;

// Mock data
const createMockGameData = (id: string): GameData => ({
  id,
  teamA: 'Warriors',
  teamB: 'Eagles',
  scoreA: 0,
  scoreB: 0,
  currentQuarter: 1,
  status: 'scheduled',
  settings: {
    quarterLength: 15,
    breakLength: 3,
    totalQuarters: 4,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});

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
  updatedAt: new Date(),
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2025-01-27T10:00:00.000Z'));
  
  // Clear timer instances between tests
  TimerService['timers'] = new Map();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('TimerService', () => {
  describe('Game Creation with Timer', () => {
    test('should create game with initial timer state', () => {
      const mockGameData = createMockGameData('game-1');
      mockGameDataStorage.createGame.mockReturnValue(mockGameData);
      mockGameDataStorage.getGame.mockReturnValue(mockGameData);
      mockTimerDataStorage.getTimerState.mockReturnValue(null); // No existing timer

      const gameWithTimer = TimerService.createGame('Warriors', 'Eagles');

      expect(gameWithTimer.teamA).toBe('Warriors');
      expect(gameWithTimer.teamB).toBe('Eagles');
      expect(gameWithTimer.timeRemaining).toBe(900); // 15 minutes in seconds
      expect(gameWithTimer.isRunning).toBe(false);
      expect(gameWithTimer.isExpired).toBe(false);
      expect(mockTimerDataStorage.saveTimerState).toHaveBeenCalled();
    });

    test('should restore timer from persistence', () => {
      const mockGameData = createMockGameData('game-1');
      const mockTimerData = {
        ...createMockTimerData('game-1'),
        isRunning: true,
        totalPausedTime: 300, // 5 minutes elapsed
      };

      mockGameDataStorage.getGame.mockReturnValue(mockGameData);
      mockTimerDataStorage.getTimerState.mockReturnValue(mockTimerData);

      const gameWithTimer = TimerService.getGameWithTimer('game-1');

      expect(gameWithTimer).toBeTruthy();
      expect(gameWithTimer!.timeRemaining).toBe(600); // 15 minutes - 5 minutes = 10 minutes
    });
  });

  describe('Timer Operations', () => {
    beforeEach(() => {
      const mockGameData = createMockGameData('game-1');
      mockGameDataStorage.getGame.mockReturnValue(mockGameData);
      mockTimerDataStorage.getTimerState.mockReturnValue(null);
    });

    test('should start timer and update game status', () => {
      const updatedGameData = { ...createMockGameData('game-1'), status: 'live' as const };
      mockGameDataStorage.updateGame.mockReturnValue(updatedGameData);
      // Mock the second getGame call to return updated data
      mockGameDataStorage.getGame.mockReturnValueOnce(createMockGameData('game-1'))
        .mockReturnValueOnce(updatedGameData);

      const result = TimerService.startTimer('game-1');

      expect(result).toBeTruthy();
      expect(result!.isRunning).toBe(true);
      expect(result!.status).toBe('live');
      expect(mockGameDataStorage.updateGame).toHaveBeenCalledWith('game-1', { status: 'live' });
      expect(mockTimerDataStorage.saveTimerState).toHaveBeenCalled();
    });

    test('should pause timer and update game status', () => {
      // Setup multiple mock returns for the pause operation
      const gameData = createMockGameData('game-1');
      const liveGameData = { ...gameData, status: 'live' as const };
      const pausedGameData = { ...gameData, status: 'scheduled' as const };
      
      mockGameDataStorage.getGame
        .mockReturnValueOnce(gameData) // For start
        .mockReturnValueOnce(liveGameData) // For start return
        .mockReturnValueOnce(liveGameData) // For pause
        .mockReturnValueOnce(pausedGameData); // For pause return
        
      mockGameDataStorage.updateGame
        .mockReturnValueOnce(liveGameData) // Start update
        .mockReturnValueOnce(pausedGameData); // Pause update

      // First start the timer
      TimerService.startTimer('game-1');

      const result = TimerService.pauseTimer('game-1');

      expect(result).toBeTruthy();
      expect(result!.isRunning).toBe(false);
      expect(mockGameDataStorage.updateGame).toHaveBeenCalledWith('game-1', { status: 'scheduled' });
    });

    test('should advance to next quarter', () => {
      const result = TimerService.nextQuarter('game-1');

      expect(result).toBeTruthy();
      expect(mockTimerDataStorage.saveTimerState).toHaveBeenCalled();
      // Timer should emit nextQuarter event which triggers game data update
    });

    test('should reset timer', () => {
      // Start and run timer for some time
      TimerService.startTimer('game-1');
      jest.advanceTimersByTime(300000); // 5 minutes

      const result = TimerService.resetTimer('game-1');

      expect(result).toBeTruthy();
      expect(result!.timeRemaining).toBe(900); // Back to full quarter length
    });
  });

  describe('Score Updates', () => {
    test('should update score without affecting timer', () => {
      const mockGameData = createMockGameData('game-1');
      const updatedGameData = { ...mockGameData, scoreA: 7 };
      
      // Setup mocks for the sequence of calls in updateScore -> getGameWithTimer
      mockGameDataStorage.updateScore.mockReturnValue(updatedGameData);
      mockGameDataStorage.getGame.mockReturnValue(updatedGameData); // Return updated data
      mockTimerDataStorage.getTimerState.mockReturnValue(null);

      const result = TimerService.updateScore('game-1', 'A', 7);

      expect(result).toBeTruthy();
      expect(result!.scoreA).toBe(7);
      expect(mockGameDataStorage.updateScore).toHaveBeenCalledWith('game-1', 'A', 7);
      // Timer should not be affected by score updates
      expect(result!.timeRemaining).toBe(900); // Still full time
    });
  });

  describe('Game Lifecycle', () => {
    test('should handle game completion', () => {
      const mockGameData = createMockGameData('game-1');
      mockGameDataStorage.getGame.mockReturnValue(mockGameData);
      mockTimerDataStorage.getTimerState.mockReturnValue(null);

      // Start the game to create timer
      TimerService.startTimer('game-1');

      // Manually trigger next quarter through all 4 quarters
      const timer = TimerService['timers'].get('game-1')!;
      
      // Mock the quarter updates
      const mockFinishedGameData = { ...mockGameData, status: 'finished' as const };
      mockGameDataStorage.updateQuarter.mockReturnValue(mockGameData);
      mockGameDataStorage.endGame.mockReturnValue(mockFinishedGameData);

      // Simulate advancing through quarters
      timer.nextQuarter(); // Q2
      timer.nextQuarter(); // Q3
      timer.nextQuarter(); // Q4
      timer.nextQuarter(); // Game finished

      expect(mockGameDataStorage.endGame).toHaveBeenCalledWith('game-1');
    });

    test('should delete game and cleanup timer', () => {
      const mockGameData = createMockGameData('game-1');
      mockGameDataStorage.getGame.mockReturnValue(mockGameData);
      mockGameDataStorage.deleteGame.mockReturnValue(true);
      mockTimerDataStorage.getTimerState.mockReturnValue(null);

      // Create timer by getting game
      TimerService.getGameWithTimer('game-1');
      expect(TimerService['timers'].has('game-1')).toBe(true);

      // Delete game
      const result = TimerService.deleteGame('game-1');

      expect(result).toBe(true);
      expect(mockGameDataStorage.deleteGame).toHaveBeenCalledWith('game-1');
      expect(mockTimerDataStorage.deleteTimerState).toHaveBeenCalledWith('game-1');
      expect(TimerService['timers'].has('game-1')).toBe(false);
    });
  });

  describe('Multiple Games', () => {
    test('should handle multiple games independently', () => {
      const mockGameData1 = createMockGameData('game-1');
      const mockGameData2 = createMockGameData('game-2');

      mockGameDataStorage.getGame
        .mockReturnValueOnce(mockGameData1)
        .mockReturnValueOnce(mockGameData2);
      mockTimerDataStorage.getTimerState.mockReturnValue(null);

      const game1 = TimerService.getGameWithTimer('game-1');
      const game2 = TimerService.getGameWithTimer('game-2');

      expect(game1).toBeTruthy();
      expect(game2).toBeTruthy();
      expect(TimerService['timers'].size).toBe(2);
      expect(TimerService['timers'].has('game-1')).toBe(true);
      expect(TimerService['timers'].has('game-2')).toBe(true);
    });

    test('should get all games with timer information', () => {
      const mockGames = [createMockGameData('game-1'), createMockGameData('game-2')];
      mockGameDataStorage.getAllGames.mockReturnValue(mockGames);
      mockGameDataStorage.getGame
        .mockReturnValueOnce(mockGames[0])
        .mockReturnValueOnce(mockGames[1]);
      mockTimerDataStorage.getTimerState.mockReturnValue(null);

      const gamesWithTimer = TimerService.getAllGamesWithTimer();

      expect(gamesWithTimer).toHaveLength(2);
      expect(gamesWithTimer[0].timeRemaining).toBeDefined();
      expect(gamesWithTimer[1].timeRemaining).toBeDefined();
    });
  });

  describe('Timer Synchronization', () => {
      test('should sync timer with external state', () => {
    const mockGameData = createMockGameData('game-1');
    mockGameDataStorage.getGame.mockReturnValue(mockGameData);
    mockTimerDataStorage.getTimerState.mockReturnValue(null);

    // Create initial timer
    TimerService.getGameWithTimer('game-1');

    // Sync with external state - need to update the game data to reflect quarter change
    const externalState = {
      isRunning: true,
      totalPausedTime: 600, // 10 minutes elapsed
      currentQuarter: 2,
    };

    // Mock the game data to show quarter 2
    const updatedGameData = { ...mockGameData, currentQuarter: 2 };
    mockGameDataStorage.getGame.mockReturnValue(updatedGameData);

    const result = TimerService.syncTimer('game-1', externalState);

    expect(result).toBeTruthy();
    expect(result!.isRunning).toBe(true);
    expect(result!.currentQuarter).toBe(2);
    expect(result!.timeRemaining).toBe(300); // 15 minutes - 10 minutes = 5 minutes
  });
  });

  describe('Memory Management', () => {
    test('should cleanup inactive timers', () => {
      const mockGames = [createMockGameData('game-1')]; // Only game-1 exists
      mockGameDataStorage.getAllGames.mockReturnValue(mockGames);
      mockGameDataStorage.getGame.mockReturnValue(mockGames[0]);
      mockTimerDataStorage.getTimerState.mockReturnValue(null);

      // Create timers for multiple games
      TimerService.getGameWithTimer('game-1');
      TimerService['timers'].set('game-2', {} as any); // Add non-existent game timer

      expect(TimerService['timers'].size).toBe(2);

      // Cleanup should remove timer for non-existent game
      TimerService.cleanupInactiveTimers();

      expect(TimerService['timers'].size).toBe(1);
      expect(TimerService['timers'].has('game-1')).toBe(true);
      expect(TimerService['timers'].has('game-2')).toBe(false);
    });

    test('should save all timer states', () => {
      const mockGameData = createMockGameData('game-1');
      mockGameDataStorage.getGame.mockReturnValue(mockGameData);
      mockTimerDataStorage.getTimerState.mockReturnValue(null);

      // Create timer
      TimerService.getGameWithTimer('game-1');

      // Save all states
      TimerService.saveAllTimerStates();

      expect(mockTimerDataStorage.saveTimerState).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent game gracefully', () => {
      mockGameDataStorage.getGame.mockReturnValue(null);

      const result = TimerService.getGameWithTimer('non-existent');
      expect(result).toBeNull();

      const startResult = TimerService.startTimer('non-existent');
      expect(startResult).toBeNull();

      const pauseResult = TimerService.pauseTimer('non-existent');
      expect(pauseResult).toBeNull();
    });

    test('should handle timer state access for debugging', () => {
      const mockGameData = createMockGameData('game-1');
      mockGameDataStorage.getGame.mockReturnValue(mockGameData);
      mockTimerDataStorage.getTimerState.mockReturnValue(null);

      // No timer created yet
      let timerState = TimerService.getTimerState('game-1');
      expect(timerState).toBeTruthy(); // Should create timer and return state

      // Timer now exists
      timerState = TimerService.getTimerState('game-1');
      expect(timerState).toBeTruthy();
      expect(timerState!.gameId).toBe('game-1');
    });
  });
});
