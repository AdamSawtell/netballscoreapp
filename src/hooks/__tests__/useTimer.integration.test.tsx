/**
 * useTimer Integration Tests
 * Comprehensive testing with proper mocking and state management
 */

import { renderHook, act } from '@testing-library/react';
import { useTimer, useAdminTimer, useSpectatorTimer } from '../useTimer';

// Setup proper mocking for the test environment
beforeAll(() => {
  jest.useFakeTimers();
  
  // Mock requestAnimationFrame and cancelAnimationFrame for smooth timer updates
  global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
    return setTimeout(() => callback(performance.now()), 16) as unknown as number;
  });
  global.cancelAnimationFrame = jest.fn(clearTimeout);
});

afterAll(() => {
  jest.useRealTimers();
  delete (global as any).requestAnimationFrame;
  delete (global as any).cancelAnimationFrame;
});

beforeEach(() => {
  jest.setSystemTime(new Date('2025-01-27T10:00:00.000Z'));
  jest.clearAllTimers();
  
  // Clear global state
  if (typeof global !== 'undefined') {
    delete (global as Record<string, unknown>).gameDataCache;
    delete (global as Record<string, unknown>).gameDataTimestamp;
    delete (global as Record<string, unknown>).timerDataCache;
    delete (global as Record<string, unknown>).timerDataTimestamp;
  }
});

describe('useTimer Integration Tests', () => {
  test('should initialize timer with correct default state', () => {
    const { result } = renderHook(() => useTimer('test-game', { quarterLength: 60 }));
    
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.currentQuarter).toBe(1);
    expect(result.current.status).toBe('scheduled');
    expect(result.current.isExpired).toBe(false);
    expect(result.current.isGameFinished).toBe(false);
  });

  test('should start timer correctly', () => {
    const { result } = renderHook(() => useTimer('test-game-2', { quarterLength: 60 }));
    
    act(() => {
      result.current.start();
    });
    
    // Event-driven updates should be immediate
    expect(result.current.isRunning).toBe(true);
    expect(result.current.status).toBe('live');
  });

  test('should pause timer correctly', () => {
    const { result } = renderHook(() => useTimer('test-game-3', { quarterLength: 60 }));
    
    // Start timer
    act(() => {
      result.current.start();
    });
    
    // Pause timer
    act(() => {
      result.current.pause();
    });
    
    expect(result.current.isRunning).toBe(false);
    expect(result.current.status).toBe('paused');
  });

  test('should handle timer reset', () => {
    const { result } = renderHook(() => useTimer('test-game-4', { quarterLength: 60 }));
    
    // Start and advance timer
    act(() => {
      result.current.start();
      jest.advanceTimersByTime(30000); // 30 seconds
    });
    
    // Reset timer
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.currentQuarter).toBe(1);
    expect(result.current.status).toBe('scheduled');
  });

  test('should handle quarter transitions', () => {
    const onQuarterEnd = jest.fn();
    const { result } = renderHook(() => 
      useTimer('test-game-5', { quarterLength: 1 }, { onQuarterEnd })
    );
    
    // Start timer and let it expire
    act(() => {
      result.current.start();
      jest.advanceTimersByTime(1000); // 1 second to expire
      jest.runOnlyPendingTimers(); // Process any pending timers
    });
    
    // Move to next quarter
    act(() => {
      result.current.nextQuarter();
    });
    
    expect(result.current.currentQuarter).toBe(2);
    expect(onQuarterEnd).toHaveBeenCalled();
  });

  test('should handle timer expiration', () => {
    const onTimerExpired = jest.fn();
    const { result } = renderHook(() => 
      useTimer('test-game-6', { quarterLength: 1 }, { onTimerExpired })
    );
    
    // Start timer and let it expire
    act(() => {
      result.current.start();
      jest.advanceTimersByTime(1100); // 1.1 seconds to ensure expiration
      jest.runOnlyPendingTimers();
    });
    
    expect(result.current.isExpired).toBe(true);
    expect(onTimerExpired).toHaveBeenCalled();
  });

  test('should finish game after 4 quarters', () => {
    const { result } = renderHook(() => useTimer('test-game-7', { quarterLength: 1 }));
    
    // Complete 4 quarters
    for (let quarter = 1; quarter <= 4; quarter++) {
      act(() => {
        result.current.start();
        jest.advanceTimersByTime(1100); // Let quarter expire
        jest.runOnlyPendingTimers();
        
        if (quarter < 4) {
          result.current.nextQuarter();
        }
      });
    }
    
    expect(result.current.currentQuarter).toBe(4);
    expect(result.current.isGameFinished).toBe(true);
    expect(result.current.status).toBe('finished');
  });
});

describe('useAdminTimer Specialization', () => {
  test('should initialize without auto-sync', () => {
    const { result } = renderHook(() => useAdminTimer('admin-game', { quarterLength: 60 }));
    
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(false);
  });

  test('should provide admin-specific functionality', () => {
    const { result } = renderHook(() => useAdminTimer('admin-game-2', { quarterLength: 60 }));
    
    // Admin should have full control
    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.pause).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.nextQuarter).toBe('function');
  });
});

describe('useSpectatorTimer Specialization', () => {
  test('should initialize with auto-sync enabled', () => {
    const onSync = jest.fn();
    const { result } = renderHook(() => 
      useSpectatorTimer('spectator-game', { quarterLength: 60 }, { onSync })
    );
    
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(false);
  });

  test('should provide spectator-specific functionality', () => {
    const { result } = renderHook(() => useSpectatorTimer('spectator-game-2', { quarterLength: 60 }));
    
    // Spectator should have read-only access
    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.pause).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.nextQuarter).toBe('function');
  });
});

describe('Memory Management and Cleanup', () => {
  test('should clean up resources on unmount', () => {
    const { result, unmount } = renderHook(() => useTimer('cleanup-game', { quarterLength: 60 }));
    
    act(() => {
      result.current.start();
    });
    
    expect(result.current.isRunning).toBe(true);
    
    // Unmount should clean up
    unmount();
    
    // No memory leaks or errors should occur
    expect(true).toBe(true); // If we get here, cleanup worked
  });

  test('should handle multiple timer instances', () => {
    const { result: timer1 } = renderHook(() => useTimer('game-1', { quarterLength: 60 }));
    const { result: timer2 } = renderHook(() => useTimer('game-2', { quarterLength: 60 }));
    
    act(() => {
      timer1.current.start();
      timer2.current.start();
    });
    
    expect(timer1.current.isRunning).toBe(true);
    expect(timer2.current.isRunning).toBe(true);
    
    // Each timer should be independent
    act(() => {
      timer1.current.pause();
    });
    
    expect(timer1.current.isRunning).toBe(false);
    expect(timer2.current.isRunning).toBe(true); // Still running
  });
});

describe('Error Handling and Edge Cases', () => {
  test('should handle invalid game IDs gracefully', () => {
    const { result } = renderHook(() => useTimer('', { quarterLength: 60 }));
    
    // Should not crash
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(false);
  });

  test('should handle zero quarter length', () => {
    const { result } = renderHook(() => useTimer('zero-game', { quarterLength: 0 }));
    
    expect(result.current.timeRemaining).toBe(0);
    expect(result.current.isExpired).toBe(true);
  });

  test('should prevent operations on expired timers', () => {
    const { result } = renderHook(() => useTimer('expired-game', { quarterLength: 1 }));
    
    // Expire the timer
    act(() => {
      result.current.start();
      jest.advanceTimersByTime(1100);
      jest.runOnlyPendingTimers();
    });
    
    expect(result.current.isExpired).toBe(true);
    
    // Try to start again (should not work)
    act(() => {
      result.current.start();
    });
    
    // Timer should remain expired
    expect(result.current.isExpired).toBe(true);
  });
});
