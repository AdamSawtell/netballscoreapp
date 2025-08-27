/**
 * Timer Hook Integration Tests
 * Tests the integration between React hooks, TimerManager, and API
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminTimer, useSpectatorTimer } from '../../src/hooks/useTimer';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Timer Hook Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock successful API responses
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        gameId: 'test-game',
        teamA: 'TeamA',
        teamB: 'TeamB',
        scoreA: 0,
        scoreB: 0,
        isRunning: false,
        timeRemaining: 600,
        status: 'scheduled'
      })
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('ADMIN TIMER: Should initialize in stopped state', async () => {
    const { result } = renderHook(() => 
      useAdminTimer('test-game', { quarterLength: 600 })
    );

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
      expect(result.current.status).toBe('scheduled');
      expect(result.current.timeRemaining).toBe(600);
    });
  });

  test('ADMIN TIMER: Start function should work', async () => {
    const { result } = renderHook(() => 
      useAdminTimer('test-game', { quarterLength: 600 })
    );

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
    });

    // Start timer
    act(() => {
      result.current.start();
    });

    // Advance time to trigger state updates
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.isRunning).toBe(true);
      expect(result.current.status).toBe('live');
    });
  });

  test('ADMIN TIMER: Should handle pause correctly', async () => {
    const { result } = renderHook(() => 
      useAdminTimer('test-game', { quarterLength: 600 })
    );

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
    });

    // Start timer
    act(() => {
      result.current.start();
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.isRunning).toBe(true);
    });

    // Pause timer
    act(() => {
      result.current.pause();
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
      expect(result.current.status).toBe('scheduled');
    });
  });

  test('SPECTATOR TIMER: Should sync with server state', async () => {
    // Mock server returning running timer
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        gameId: 'test-game',
        isRunning: true,
        timeRemaining: 550,
        status: 'live'
      })
    });

    const { result } = renderHook(() => 
      useSpectatorTimer('test-game', { quarterLength: 600 })
    );

    // Wait for sync to complete
    await waitFor(() => {
      expect(result.current.isRunning).toBe(true);
      expect(result.current.status).toBe('live');
      expect(result.current.timeRemaining).toBe(550);
    }, { timeout: 5000 });
  });

  test('TIMER STATE CONSISTENCY: Multiple hooks should stay in sync', async () => {
    const { result: adminResult } = renderHook(() => 
      useAdminTimer('test-game', { quarterLength: 600 })
    );

    const { result: spectatorResult } = renderHook(() => 
      useSpectatorTimer('test-game', { quarterLength: 600 })
    );

    await waitFor(() => {
      expect(adminResult.current.isRunning).toBe(false);
      expect(spectatorResult.current.isRunning).toBe(false);
    });

    // Start timer in admin
    act(() => {
      adminResult.current.start();
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Both should show running state
    await waitFor(() => {
      expect(adminResult.current.isRunning).toBe(true);
      expect(spectatorResult.current.isRunning).toBe(true);
    });
  });

  test('ERROR RECOVERY: Should handle API failures gracefully', async () => {
    // Mock API failure
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => 
      useAdminTimer('test-game', { quarterLength: 600 })
    );

    // Should still initialize with default state
    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
      expect(result.current.timeRemaining).toBe(600);
    });

    // Timer functions should still work locally
    act(() => {
      result.current.start();
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.isRunning).toBe(true);
    });
  });
});
