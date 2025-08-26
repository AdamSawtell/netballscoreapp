/**
 * TimerManager Unit Tests
 * Phase 1.1: Comprehensive testing for timer accuracy and functionality
 */

import { TimerManager } from '../TimerManager';
import { TimerEvent } from '../TimerState';

// Mock Date for predictable testing
const mockDate = new Date('2025-01-27T10:00:00.000Z');

beforeAll(() => {
  // Mock Date constructor and Date.now
  jest.useFakeTimers();
  jest.setSystemTime(mockDate);
});

afterAll(() => {
  jest.useRealTimers();
});

describe('TimerManager', () => {
  let timer: TimerManager;
  let events: TimerEvent[] = [];

  beforeEach(() => {
    timer = new TimerManager('test-game-1', { quarterLength: 60 }); // 1 minute for testing
    events = [];
    
    timer.subscribe((event) => {
      events.push(event);
    });
  });

  describe('Initialization', () => {
    test('should initialize with correct default state', () => {
      const state = timer.getState();
      
      expect(state.isRunning).toBe(false);
      expect(state.startedAt).toBeNull();
      expect(state.pausedAt).toBeNull();
      expect(state.totalPausedTime).toBe(0);
      expect(state.quarterLength).toBe(60);
      expect(state.currentQuarter).toBe(1);
      expect(state.gameId).toBe('test-game-1');
      expect(state.status).toBe('scheduled');
    });

    test('should return full quarter time initially', () => {
      expect(timer.getCurrentTime()).toBe(60);
    });
  });

  describe('Timer Start/Pause', () => {
    test('should start timer correctly', () => {
      timer.start();
      const state = timer.getState();
      
      expect(state.isRunning).toBe(true);
      expect(state.startedAt).toEqual(mockDate);
      expect(state.status).toBe('live');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('start');
    });

    test('should not start if already running', () => {
      timer.start();
      timer.start(); // Second start should be ignored
      
      expect(events).toHaveLength(1); // Only one event
    });

    test('should pause timer correctly', () => {
      timer.start();
      
      // Simulate 10 seconds passing
      jest.advanceTimersByTime(10000);
      
      timer.pause();
      const state = timer.getState();
      
      expect(state.isRunning).toBe(false);
      expect(state.pausedAt).toBeDefined();
      expect(state.totalPausedTime).toBe(10);
      expect(state.status).toBe('scheduled');
      expect(events).toHaveLength(2);
      expect(events[1].type).toBe('pause');
    });

    test('should not pause if not running', () => {
      timer.pause();
      expect(events).toHaveLength(0);
    });
  });

  describe('Time Calculation', () => {
    test('should calculate remaining time correctly when running', () => {
      timer.start();
      
      // Simulate 15 seconds passing
      jest.advanceTimersByTime(15000);
      
      expect(timer.getCurrentTime()).toBe(45); // 60 - 15 = 45
    });

    test('should handle pause and resume correctly', () => {
      // Start timer
      timer.start();
      
      // Run for 10 seconds
      jest.advanceTimersByTime(10000);
      timer.pause();
      
      expect(timer.getCurrentTime()).toBe(50); // 60 - 10 = 50
      
      // Advance time while paused (should not affect remaining time)
      jest.advanceTimersByTime(10000);
      expect(timer.getCurrentTime()).toBe(50); // Still 50
      
      // Resume timer
      timer.start();
      
      // Run for another 5 seconds
      jest.advanceTimersByTime(5000);
      expect(timer.getCurrentTime()).toBe(45); // 60 - 10 - 5 = 45
    });

    test('should not go below zero', () => {
      timer.start();
      
      // Simulate time passing beyond quarter length
      jest.advanceTimersByTime(70000); // 70 seconds
      
      expect(timer.getCurrentTime()).toBe(0);
    });
  });

  describe('Quarter Management', () => {
    test('should advance to next quarter', () => {
      timer.nextQuarter();
      const state = timer.getState();
      
      expect(state.currentQuarter).toBe(2);
      expect(state.isRunning).toBe(false);
      expect(state.totalPausedTime).toBe(0);
      expect(state.status).toBe('scheduled');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('nextQuarter');
    });

    test('should finish game after 4th quarter', () => {
      // Advance through quarters
      timer.nextQuarter(); // Q2
      timer.nextQuarter(); // Q3
      timer.nextQuarter(); // Q4
      timer.nextQuarter(); // Should finish
      
      const state = timer.getState();
      expect(state.currentQuarter).toBe(4); // Stays at 4
      expect(state.status).toBe('finished');
      expect(timer.isGameFinished()).toBe(true);
    });
  });

  describe('Timer Expiration', () => {
    test('should detect timer expiration', () => {
      timer.start();
      
      // Simulate time running out
      jest.advanceTimersByTime(61000); // 61 seconds
      
      expect(timer.isExpired()).toBe(true);
      expect(timer.getCurrentTime()).toBe(0);
    });

    test('should not start expired timer', () => {
      // Set up expired timer
      timer.start();
      jest.advanceTimersByTime(61000);
      timer.pause();
      
      // Try to start expired timer
      timer.start();
      
      expect(timer.getState().isRunning).toBe(false);
    });
  });

  describe('Reset Functionality', () => {
    test('should reset timer to quarter start', () => {
      timer.start();
      jest.advanceTimersByTime(30000);
      timer.pause();
      
      timer.reset();
      const state = timer.getState();
      
      expect(state.isRunning).toBe(false);
      expect(state.totalPausedTime).toBe(0);
      expect(state.startedAt).toBeNull();
      expect(state.pausedAt).toBeNull();
      expect(timer.getCurrentTime()).toBe(60);
      expect(events[events.length - 1].type).toBe('reset');
    });
  });

  describe('Event System', () => {
    test('should notify all listeners', () => {
      const events1: TimerEvent[] = [];
      const events2: TimerEvent[] = [];
      
      const unsubscribe1 = timer.subscribe(event => events1.push(event));
      const unsubscribe2 = timer.subscribe(event => events2.push(event));
      
      timer.start();
      
      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
      
      unsubscribe1();
      timer.pause();
      
      expect(events1).toHaveLength(1); // No new events
      expect(events2).toHaveLength(2); // Got pause event
      
      unsubscribe2();
    });

    test('should handle listener errors gracefully', () => {
      timer.subscribe(() => {
        throw new Error('Test error');
      });
      
      // Should not throw
      expect(() => timer.start()).not.toThrow();
    });
  });

  describe('State Synchronization', () => {
    test('should sync with external state', () => {
      timer.syncWithState({
        isRunning: true,
        currentQuarter: 3,
        totalPausedTime: 30,
      });
      
      const state = timer.getState();
      expect(state.isRunning).toBe(true);
      expect(state.currentQuarter).toBe(3);
      expect(state.totalPausedTime).toBe(30);
      expect(events[events.length - 1].type).toBe('sync');
    });

    test('should not emit event if state unchanged', () => {
      const initialState = timer.getState();
      timer.syncWithState(initialState);
      
      expect(events).toHaveLength(0);
    });
  });
});

/**
 * Timer Accuracy Tests - Extended duration testing
 */
describe('TimerManager Accuracy Tests', () => {
  test('should maintain accuracy over extended periods', () => {
    const timer = new TimerManager('accuracy-test', { quarterLength: 900 }); // 15 minutes
    
    timer.start();
    
    // Simulate timer running for exactly 5 minutes (300 seconds)
    jest.advanceTimersByTime(300000);
    
    const remainingTime = timer.getCurrentTime();
    const expectedRemaining = 900 - 300; // 600 seconds
    
    // Should be accurate within 100ms (0.1 seconds)
    expect(Math.abs(remainingTime - expectedRemaining)).toBeLessThan(0.1);
  });

  test('should handle multiple pause/resume cycles accurately', () => {
    const timer = new TimerManager('cycle-test', { quarterLength: 300 }); // 5 minutes
    
    // Start → Run 60s → Pause → Wait 30s → Resume → Run 60s → Pause
    timer.start();
    
    // Run for 60 seconds
    jest.advanceTimersByTime(60000);
    timer.pause();
    
    // Wait 30 seconds while paused (should not affect timer)
    jest.advanceTimersByTime(30000);
    timer.start();
    
    // Run for another 60 seconds
    jest.advanceTimersByTime(60000);
    timer.pause();
    
    // Total elapsed: 60 + 60 = 120 seconds
    // Remaining: 300 - 120 = 180 seconds
    expect(timer.getCurrentTime()).toBe(180);
  });
});
