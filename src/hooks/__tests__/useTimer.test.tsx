/**
 * useTimer Hook Tests
 * Phase 1.2: Testing React integration with TimerManager
 */

import { renderHook, act } from '@testing-library/react';
import { useTimer, useAdminTimer, useSpectatorTimer } from '../useTimer';

// Mock timers and requestAnimationFrame for testing
let mockRAF: jest.Mock;
let mockCancelRAF: jest.Mock;

beforeAll(() => {
  jest.useFakeTimers();
  
  // Mock requestAnimationFrame and cancelAnimationFrame
  mockRAF = jest.fn((callback: FrameRequestCallback) => {
    return setTimeout(() => callback(performance.now()), 16) as unknown as number; // 60fps
  });
  mockCancelRAF = jest.fn(clearTimeout);
  
  global.requestAnimationFrame = mockRAF;
  global.cancelAnimationFrame = mockCancelRAF;
});

afterAll(() => {
  jest.useRealTimers();
  // Restore original RAF functions
  delete (global as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame;
  delete (global as unknown as { cancelAnimationFrame: unknown }).cancelAnimationFrame;
});

beforeEach(() => {
  jest.setSystemTime(new Date('2025-01-27T10:00:00.000Z'));
  jest.clearAllTimers();
  mockRAF.mockClear();
  mockCancelRAF.mockClear();
});

describe('useTimer', () => {
  test('should initialize with correct default state', () => {
    const { result } = renderHook(() => useTimer('test-game-1', { quarterLength: 60 }));
    
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.currentQuarter).toBe(1);
    expect(result.current.status).toBe('scheduled');
    expect(result.current.isExpired).toBe(false);
    expect(result.current.isGameFinished).toBe(false);
  });

  test('should start and pause timer correctly', () => {
    const { result } = renderHook(() => useTimer('test-game-2', { quarterLength: 60 }));
    
    // Start timer and wait for state updates
    act(() => {
      result.current.start();
    });
    
    // Wait for events to propagate and state to update
    act(() => {
      jest.advanceTimersByTime(16); // RAF callback
    });
    
    expect(result.current.isRunning).toBe(true);
    expect(result.current.status).toBe('live');
    
    // Run for 10 seconds and advance the display update interval
    act(() => {
      jest.advanceTimersByTime(10000); // 10 seconds
      jest.advanceTimersByTime(16); // Trigger display update (RAF)
      jest.advanceTimersByTime(100); // Trigger throttled update
    });
    
    expect(Math.round(result.current.timeRemaining)).toBe(50);
    
    // Pause timer
    act(() => {
      result.current.pause();
    });
    
    expect(result.current.isRunning).toBe(false);
    expect(result.current.status).toBe('scheduled');
    expect(Math.round(result.current.timeRemaining)).toBe(50);
  });

  test('should handle timer expiration callback', () => {
    const onTimerExpired = jest.fn();
    const { result } = renderHook(() => 
      useTimer('test-game-3', { 
        quarterLength: 5, // Use shorter time for testing
        onTimerExpired 
      })
    );
    
    // Start timer and run until expiration
    act(() => {
      result.current.start();
      jest.advanceTimersByTime(6000); // 6 seconds (more than 5)
      result.current.pause(); // Force event to trigger
    });
    
    expect(result.current.timeRemaining).toBe(0);
    expect(result.current.isExpired).toBe(true);
  });

  test('should handle quarter transitions', () => {
    const onQuarterEnd = jest.fn();
    const { result } = renderHook(() => 
      useTimer('test-game-4', { 
        quarterLength: 60,
        onQuarterEnd
      })
    );
    
    // Move to next quarter
    act(() => {
      result.current.nextQuarter();
    });
    
    expect(result.current.currentQuarter).toBe(2);
    expect(onQuarterEnd).toHaveBeenCalledTimes(1);
    
    // Reset for new quarter
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(false);
  });

  test('should finish game after 4 quarters', () => {
    const { result } = renderHook(() => useTimer('test-game-5', { quarterLength: 60 }));
    
    // Go through all quarters
    act(() => {
      result.current.nextQuarter(); // Q2
      result.current.nextQuarter(); // Q3
      result.current.nextQuarter(); // Q4
      result.current.nextQuarter(); // Game finished
    });
    
    expect(result.current.currentQuarter).toBe(4);
    expect(result.current.status).toBe('finished');
    expect(result.current.isGameFinished).toBe(true);
  });

  test('should reset timer correctly', () => {
    const { result } = renderHook(() => useTimer('test-game-6', { quarterLength: 60 }));
    
    // Start timer and run for some time
    act(() => {
      result.current.start();
      jest.advanceTimersByTime(30000);
      result.current.pause();
    });
    
    expect(result.current.timeRemaining).toBe(30);
    
    // Reset timer
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.status).toBe('scheduled');
  });

  test('should sync with server state', () => {
    const onSync = jest.fn();
    const { result } = renderHook(() => 
      useTimer('test-game-7', { 
        quarterLength: 60,
        onSync
      })
    );
    
    // Sync with server state
    act(() => {
      result.current.syncWithServer({
        isRunning: true,
        currentQuarter: 3,
        totalPausedTime: 15,
        status: 'live'
      });
    });
    
    expect(result.current.isRunning).toBe(true);
    expect(result.current.currentQuarter).toBe(3);
    expect(result.current.status).toBe('live');
    expect(result.current.timeRemaining).toBe(45); // 60 - 15 = 45
    expect(onSync).toHaveBeenCalledTimes(1);
  });

  test('should handle auto-sync when enabled', () => {
    const { result } = renderHook(() => 
      useTimer('test-game-8', { 
        quarterLength: 60,
        autoSync: true,
        syncInterval: 1000 // 1 second for testing
      })
    );
    
    // Start timer
    act(() => {
      result.current.start();
    });
    
    // Advance time and check auto-sync updates
    act(() => {
      jest.advanceTimersByTime(5000); // 5 seconds
    });
    
    expect(result.current.timeRemaining).toBe(55);
    
    // Auto-sync should trigger
    act(() => {
      jest.advanceTimersByTime(1000); // Trigger sync interval
    });
    
    expect(result.current.timeRemaining).toBe(54);
  });
});

describe('useAdminTimer', () => {
  test('should initialize without auto-sync', () => {
    const { result } = renderHook(() => useAdminTimer('admin-game-1', { quarterLength: 60 }));
    
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(false);
    
    // Admin timers should not auto-sync
    act(() => {
      result.current.start();
      jest.advanceTimersByTime(10000);
      result.current.pause(); // Force state update
    });
    
    expect(Math.round(result.current.timeRemaining)).toBe(50);
  });
});

describe('useSpectatorTimer', () => {
  test('should initialize with auto-sync enabled', () => {
    const { result } = renderHook(() => useSpectatorTimer('spectator-game-1', { quarterLength: 60 }));
    
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(false);
    
    // Spectator timers should auto-sync (3-second interval)
    act(() => {
      result.current.start();
      jest.advanceTimersByTime(15000); // 15 seconds
    });
    
    expect(result.current.timeRemaining).toBe(45);
    
    // Trigger auto-sync
    act(() => {
      jest.advanceTimersByTime(3000); // 3-second sync interval
    });
    
    expect(result.current.timeRemaining).toBe(42);
  });
});

describe('Timer accuracy and edge cases', () => {
  test('should handle rapid start/pause cycles', () => {
    const { result } = renderHook(() => useTimer('edge-case-1', { quarterLength: 60 }));
    
    // Rapid start/pause
    act(() => {
      result.current.start();
      jest.advanceTimersByTime(1000);
      result.current.pause();
      jest.advanceTimersByTime(500);
      result.current.start();
      jest.advanceTimersByTime(2000);
      result.current.pause();
    });
    
    // Should have 57 seconds remaining (60 - 1 - 2 = 57)
    expect(result.current.timeRemaining).toBe(57);
  });

  test('should prevent starting expired timer', () => {
    const { result } = renderHook(() => useTimer('edge-case-2', { quarterLength: 5 }));
    
    // Run timer to completion
    act(() => {
      result.current.start();
      jest.advanceTimersByTime(6000); // More than 5 seconds
      result.current.pause();
    });
    
    expect(result.current.timeRemaining).toBe(0);
    expect(result.current.isExpired).toBe(true);
    
    // Try to start expired timer (should fail)
    act(() => {
      result.current.start();
    });
    
    expect(result.current.isRunning).toBe(false);
  });

  test('should maintain state consistency across updates', () => {
    const { result } = renderHook(() => useTimer('consistency-test', { quarterLength: 120 }));
    
    // Complex sequence of operations
    act(() => {
      result.current.start();
      jest.advanceTimersByTime(30000); // 30 seconds
      result.current.pause();
      result.current.syncWithServer({ totalPausedTime: 30 });
      result.current.start();
      jest.advanceTimersByTime(45000); // 45 more seconds
      result.current.pause();
    });
    
    // Total elapsed: 30 + 45 = 75 seconds
    // Remaining: 120 - 75 = 45 seconds
    expect(result.current.timeRemaining).toBe(45);
    expect(result.current.fullState.totalPausedTime).toBe(75);
  });
});
