/**
 * Timer State Interface - Single Source of Truth for Timer Data
 * Created: Phase 1.1 of Timer Refactor
 */

export interface TimerState {
  /** Whether the timer is currently running */
  isRunning: boolean;
  
  /** When the timer was started (null if never started) */
  startedAt: Date | null;
  
  /** When the timer was paused (null if not paused) */
  pausedAt: Date | null;
  
  /** Total time spent paused (in seconds) */
  totalPausedTime: number;
  
  /** Length of each quarter in seconds */
  quarterLength: number;
  
  /** Current quarter (1-4) */
  currentQuarter: number;
  
  /** Game ID this timer belongs to */
  gameId: string;
  
  /** Status of the game */
  status: 'scheduled' | 'live' | 'finished';
}

export interface TimerEvent {
  type: 'start' | 'pause' | 'nextQuarter' | 'reset' | 'sync';
  timestamp: Date;
  gameId: string;
  state: TimerState;
  source: 'admin' | 'server' | 'spectator';
}

export type TimerListener = (event: TimerEvent) => void;

export interface TimerConfig {
  quarterLength: number; // in seconds
  totalQuarters: number;
  gameId: string;
}

// Default timer configuration
export const DEFAULT_TIMER_CONFIG: Omit<TimerConfig, 'gameId'> = {
  quarterLength: 15 * 60, // 15 minutes
  totalQuarters: 4,
};
