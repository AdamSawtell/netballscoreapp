/**
 * API Route Tests - /api/test-timer
 * Comprehensive testing of the unified API endpoint
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '../test-timer/route';

// Mock TimerService
jest.mock('@/lib/services/TimerService', () => ({
  TimerService: {
    createGame: jest.fn(),
    startTimer: jest.fn(),
    pauseTimer: jest.fn(),
    nextQuarter: jest.fn(),
    resetTimer: jest.fn(),
    updateScore: jest.fn(),
    getGameWithTimer: jest.fn(),
    getAllGamesWithTimer: jest.fn(),
    cleanupInactiveTimers: jest.fn(),
    saveAllTimerStates: jest.fn(),
  }
}));

import { TimerService } from '@/lib/services/TimerService';

const mockTimerService = TimerService as jest.Mocked<typeof TimerService>;

describe('POST /api/test-timer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create game successfully', async () => {
    const mockGame = {
      id: 'test-game-1',
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 0,
      scoreB: 0,
      currentQuarter: 1,
      timeRemaining: 900,
      isRunning: false,
      status: 'scheduled',
      isExpired: false,
      isGameFinished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      quarterLength: 15
    };

    mockTimerService.createGame.mockReturnValue(mockGame);

    const request = new NextRequest('http://localhost:3000/api/test-timer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'createGame',
        teamA: 'Team A',
        teamB: 'Team B',
        quarterLength: 15
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.game).toEqual(mockGame);
    expect(data.message).toContain('Game created');
    expect(mockTimerService.createGame).toHaveBeenCalledWith('Team A', 'Team B', { quarterLength: 15 });
  });

  test('should start timer successfully', async () => {
    const mockGame = {
      id: 'test-game-1',
      isRunning: true,
      status: 'live',
      timeRemaining: 900
    };

    mockTimerService.startTimer.mockReturnValue(mockGame as any);

    const request = new NextRequest('http://localhost:3000/api/test-timer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'startTimer',
        gameId: 'test-game-1'
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.game.isRunning).toBe(true);
    expect(data.message).toContain('Timer started');
    expect(mockTimerService.startTimer).toHaveBeenCalledWith('test-game-1');
  });

  test('should pause timer successfully', async () => {
    const mockGame = {
      id: 'test-game-1',
      isRunning: false,
      status: 'paused',
      timeRemaining: 850
    };

    mockTimerService.pauseTimer.mockReturnValue(mockGame as any);

    const request = new NextRequest('http://localhost:3000/api/test-timer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'pauseTimer',
        gameId: 'test-game-1'
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.game.isRunning).toBe(false);
    expect(data.message).toContain('Timer paused');
    expect(mockTimerService.pauseTimer).toHaveBeenCalledWith('test-game-1');
  });

  test('should handle next quarter transition', async () => {
    const mockGame = {
      id: 'test-game-1',
      currentQuarter: 2,
      timeRemaining: 900,
      status: 'scheduled'
    };

    mockTimerService.nextQuarter.mockReturnValue(mockGame as any);

    const request = new NextRequest('http://localhost:3000/api/test-timer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'nextQuarter',
        gameId: 'test-game-1'
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.game.currentQuarter).toBe(2);
    expect(data.message).toContain('Quarter 2');
    expect(mockTimerService.nextQuarter).toHaveBeenCalledWith('test-game-1');
  });

  test('should reset timer successfully', async () => {
    const mockGame = {
      id: 'test-game-1',
      currentQuarter: 1,
      timeRemaining: 900,
      isRunning: false,
      status: 'scheduled'
    };

    mockTimerService.resetTimer.mockReturnValue(mockGame as any);

    const request = new NextRequest('http://localhost:3000/api/test-timer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'resetTimer',
        gameId: 'test-game-1'
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.game.currentQuarter).toBe(1);
    expect(data.message).toContain('Timer reset');
    expect(mockTimerService.resetTimer).toHaveBeenCalledWith('test-game-1');
  });

  test('should update score successfully', async () => {
    const mockGame = {
      id: 'test-game-1',
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 5,
      scoreB: 3
    };

    mockTimerService.updateScore.mockReturnValue(mockGame as any);

    const request = new NextRequest('http://localhost:3000/api/test-timer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateScore',
        gameId: 'test-game-1',
        team: 'A',
        points: 2
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.game.scoreA).toBe(5);
    expect(data.message).toContain('Score updated');
    expect(mockTimerService.updateScore).toHaveBeenCalledWith('test-game-1', 'A', 2);
  });

  test('should handle cleanup action', async () => {
    mockTimerService.cleanupInactiveTimers.mockReturnValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/test-timer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'cleanup'
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('Cleanup completed');
    expect(mockTimerService.cleanupInactiveTimers).toHaveBeenCalled();
  });

  test('should handle save all states action', async () => {
    mockTimerService.saveAllTimerStates.mockReturnValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/test-timer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'saveAllStates'
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('All timer states saved');
    expect(mockTimerService.saveAllTimerStates).toHaveBeenCalled();
  });

  test('should return error for unknown action', async () => {
    const request = new NextRequest('http://localhost:3000/api/test-timer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'unknownAction'
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Unknown action');
    expect(data.availableActions).toBeInstanceOf(Array);
  });

  test('should handle API errors gracefully', async () => {
    mockTimerService.createGame.mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const request = new NextRequest('http://localhost:3000/api/test-timer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'createGame',
        teamA: 'Team A',
        teamB: 'Team B'
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Database connection failed');
    expect(data.stack).toBeDefined();
  });
});

describe('GET /api/test-timer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should get specific game by ID', async () => {
    const mockGame = {
      id: 'test-game-1',
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 5,
      scoreB: 3,
      currentQuarter: 2,
      timeRemaining: 450,
      isRunning: true,
      status: 'live',
      isExpired: false,
      isGameFinished: false
    };

    mockTimerService.getGameWithTimer.mockReturnValue(mockGame as any);

    const request = new NextRequest('http://localhost:3000/api/test-timer?gameId=test-game-1');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.game).toEqual(mockGame);
    expect(data.message).toContain('Game found');
    expect(mockTimerService.getGameWithTimer).toHaveBeenCalledWith('test-game-1');
  });

  test('should return 404 for non-existent game', async () => {
    mockTimerService.getGameWithTimer.mockReturnValue(null);

    const request = new NextRequest('http://localhost:3000/api/test-timer?gameId=non-existent');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Game not found');
    expect(mockTimerService.getGameWithTimer).toHaveBeenCalledWith('non-existent');
  });

  test('should get all games when no gameId provided', async () => {
    const mockGames = [
      { id: 'game-1', teamA: 'Team A', teamB: 'Team B' },
      { id: 'game-2', teamA: 'Team C', teamB: 'Team D' }
    ];

    mockTimerService.getAllGamesWithTimer.mockReturnValue(mockGames as any);

    const request = new NextRequest('http://localhost:3000/api/test-timer');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.games).toEqual(mockGames);
    expect(data.count).toBe(2);
    expect(data.message).toContain('API Health Check');
    expect(data.timestamp).toBeDefined();
    expect(mockTimerService.getAllGamesWithTimer).toHaveBeenCalled();
  });

  test('should handle GET errors gracefully', async () => {
    mockTimerService.getGameWithTimer.mockImplementation(() => {
      throw new Error('Storage error');
    });

    const request = new NextRequest('http://localhost:3000/api/test-timer?gameId=error-game');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Storage error');
  });
});

describe('API Route Integration', () => {
  test('should handle complete game lifecycle', async () => {
    // Create game
    const createRequest = new NextRequest('http://localhost:3000/api/test-timer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'createGame',
        teamA: 'Lakers',
        teamB: 'Warriors',
        quarterLength: 15
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const mockCreatedGame = {
      id: 'lifecycle-game',
      teamA: 'Lakers',
      teamB: 'Warriors',
      scoreA: 0,
      scoreB: 0,
      currentQuarter: 1,
      timeRemaining: 900,
      isRunning: false,
      status: 'scheduled'
    };

    mockTimerService.createGame.mockReturnValue(mockCreatedGame as any);

    const createResponse = await POST(createRequest);
    const createData = await createResponse.json();

    expect(createResponse.status).toBe(200);
    expect(createData.success).toBe(true);

    // Start timer
    const startRequest = new NextRequest('http://localhost:3000/api/test-timer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'startTimer',
        gameId: 'lifecycle-game'
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const mockRunningGame = { ...mockCreatedGame, isRunning: true, status: 'live' };
    mockTimerService.startTimer.mockReturnValue(mockRunningGame as any);

    const startResponse = await POST(startRequest);
    const startData = await startResponse.json();

    expect(startResponse.status).toBe(200);
    expect(startData.game.isRunning).toBe(true);

    // Add score
    const scoreRequest = new NextRequest('http://localhost:3000/api/test-timer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateScore',
        gameId: 'lifecycle-game',
        team: 'A',
        points: 3
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const mockScoredGame = { ...mockRunningGame, scoreA: 3 };
    mockTimerService.updateScore.mockReturnValue(mockScoredGame as any);

    const scoreResponse = await POST(scoreRequest);
    const scoreData = await scoreResponse.json();

    expect(scoreResponse.status).toBe(200);
    expect(scoreData.game.scoreA).toBe(3);

    // Get game state
    const getRequest = new NextRequest('http://localhost:3000/api/test-timer?gameId=lifecycle-game');
    mockTimerService.getGameWithTimer.mockReturnValue(mockScoredGame as any);

    const getResponse = await GET(getRequest);
    const getData = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(getData.game.id).toBe('lifecycle-game');
    expect(getData.game.scoreA).toBe(3);
  });

  test('should validate required parameters', async () => {
    // Missing gameId for timer operations
    const request = new NextRequest('http://localhost:3000/api/test-timer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'startTimer'
        // Missing gameId
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500); // Should handle the missing gameId gracefully
    expect(data.success).toBe(false);
  });
});
