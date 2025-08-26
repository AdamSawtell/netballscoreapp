/**
 * TimerManager - Single Source of Truth for Timer Logic
 * Phase 1.1: Core timer implementation with precise calculations
 */

import { TimerState, TimerEvent, TimerListener, TimerConfig, DEFAULT_TIMER_CONFIG } from './TimerState';

export class TimerManager {
  private state: TimerState;
  private listeners: Set<TimerListener> = new Set();
  private config: TimerConfig;

  constructor(gameId: string, config?: Partial<TimerConfig>) {
    this.config = {
      ...DEFAULT_TIMER_CONFIG,
      gameId,
      ...config,
    };

    this.state = {
      isRunning: false,
      startedAt: null,
      pausedAt: null,
      totalPausedTime: 0,
      quarterLength: this.config.quarterLength,
      currentQuarter: 1,
      gameId: this.config.gameId,
      status: 'scheduled',
    };
  }

  /**
   * Get current time remaining in seconds
   * This is the authoritative calculation - no other timer calculations should exist
   */
  getCurrentTime(): number {
    if (!this.state.isRunning || !this.state.startedAt) {
      // Timer not running - return full quarter length minus any previous elapsed time
      const elapsedBeforePause = this.state.totalPausedTime;
      return Math.max(0, this.state.quarterLength - elapsedBeforePause);
    }

    // Timer is running - calculate precise remaining time
    const now = Date.now();
    const elapsedSinceStart = (now - this.state.startedAt.getTime()) / 1000;
    const totalElapsed = elapsedSinceStart + this.state.totalPausedTime;
    const remaining = this.state.quarterLength - totalElapsed;

    return Math.max(0, Math.round(remaining * 10) / 10); // Round to 100ms precision
  }

  /**
   * Start the timer
   */
  start(): void {
    if (this.state.isRunning) {
      console.warn('Timer already running');
      return;
    }

    // Calculate time remaining before checking if expired
    const timeRemaining = this.state.quarterLength - this.state.totalPausedTime;
    if (timeRemaining <= 0) {
      console.warn('Cannot start timer - no time remaining');
      return;
    }

    const now = new Date();
    this.state = {
      ...this.state,
      isRunning: true,
      startedAt: now,
      pausedAt: null,
      status: 'live',
    };

    this.emitEvent('start', now);
  }

  /**
   * Pause the timer
   */
  pause(): void {
    if (!this.state.isRunning || !this.state.startedAt) {
      console.warn('Timer not running');
      return;
    }

    const now = new Date();
    const elapsedSinceStart = (now.getTime() - this.state.startedAt.getTime()) / 1000;

    this.state = {
      ...this.state,
      isRunning: false,
      pausedAt: now,
      totalPausedTime: this.state.totalPausedTime + elapsedSinceStart,
      startedAt: null,
      status: 'scheduled',
    };

    this.emitEvent('pause', now);
  }

  /**
   * Move to next quarter
   */
  nextQuarter(): void {
    const nextQuarter = this.state.currentQuarter + 1;
    const isFinished = nextQuarter > this.config.totalQuarters;

    this.state = {
      ...this.state,
      currentQuarter: isFinished ? this.state.currentQuarter : nextQuarter,
      isRunning: false,
      startedAt: null,
      pausedAt: null,
      totalPausedTime: 0,
      status: isFinished ? 'finished' : 'scheduled',
    };

    this.emitEvent('nextQuarter', new Date());
  }

  /**
   * Reset timer to start of current quarter
   */
  reset(): void {
    this.state = {
      ...this.state,
      isRunning: false,
      startedAt: null,
      pausedAt: null,
      totalPausedTime: 0,
      status: 'scheduled',
    };

    this.emitEvent('reset', new Date());
  }

  /**
   * Get current timer state (read-only)
   */
  getState(): Readonly<TimerState> {
    return { ...this.state };
  }

  /**
   * Subscribe to timer events
   */
  subscribe(listener: TimerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Sync with external timer state (for server synchronization)
   */
  syncWithState(externalState: Partial<TimerState>): void {
    const oldState = { ...this.state };
    
    this.state = {
      ...this.state,
      ...externalState,
    };

    // Only emit if state actually changed
    if (JSON.stringify(oldState) !== JSON.stringify(this.state)) {
      this.emitEvent('sync', new Date());
    }
  }

  /**
   * Check if timer has expired
   */
  isExpired(): boolean {
    return this.getCurrentTime() <= 0;
  }

  /**
   * Check if game is finished
   */
  isGameFinished(): boolean {
    return this.state.status === 'finished';
  }

  private emitEvent(type: TimerEvent['type'], timestamp: Date): void {
    const event: TimerEvent = {
      type,
      timestamp,
      gameId: this.state.gameId,
      state: { ...this.state },
      source: 'admin', // Will be configurable per instance
    };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Timer event listener error:', error);
      }
    });
  }
}
