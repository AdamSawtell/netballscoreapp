/**
 * useTimer React Hook - Clean interface for timer management
 * Phase 1.2: React integration with TimerManager
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerManager } from '../lib/timer/TimerManager';
import { TimerState, TimerEvent, TimerConfig } from '../lib/timer/TimerState';

export interface UseTimerConfig extends Partial<TimerConfig> {
  autoSync?: boolean; // Auto-sync with server
  syncInterval?: number; // Sync interval in ms (default: 3000)
  onTimerExpired?: () => void; // Callback when timer reaches 0
  onQuarterEnd?: () => void; // Callback when quarter ends
  onSync?: (state: TimerState) => void; // Callback on server sync
}

export interface UseTimerReturn {
  // Current state
  timeRemaining: number;
  isRunning: boolean;
  currentQuarter: number;
  status: 'scheduled' | 'live' | 'finished';
  isExpired: boolean;
  isGameFinished: boolean;
  
  // Actions
  start: () => void;
  pause: () => void;
  nextQuarter: () => void;
  reset: () => void;
  
  // For server synchronization
  syncWithServer: (serverState: Partial<TimerState>) => void;
  
  // Full state access (for debugging)
  fullState: TimerState;
}

export function useTimer(gameId: string, config: UseTimerConfig = {}): UseTimerReturn {
  const {
    autoSync = false,
    syncInterval = 3000,
    onTimerExpired,
    onQuarterEnd,
    onSync,
    ...timerConfig
  } = config;

  // Core timer instance
  const timerRef = useRef<TimerManager | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // React state for UI updates
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentQuarter, setCurrentQuarter] = useState(1);
  const [status, setStatus] = useState<'scheduled' | 'live' | 'finished'>('scheduled');
  const [fullState, setFullState] = useState<TimerState | null>(null);

  // Initialize timer
  useEffect(() => {
    if (!timerRef.current) {
      timerRef.current = new TimerManager(gameId, timerConfig);
      
      // Subscribe to timer events - this is the primary update mechanism
      const unsubscribe = timerRef.current.subscribe((event: TimerEvent) => {
        const state = event.state;
        const currentTime = timerRef.current!.getCurrentTime();
        
        setTimeRemaining(currentTime);
        setIsRunning(state.isRunning);
        setCurrentQuarter(state.currentQuarter);
        setStatus(state.status);
        setFullState(state);
        
        // Handle callbacks
        if (event.type === 'start' || event.type === 'pause') {
          if (currentTime <= 0 && onTimerExpired) {
            onTimerExpired();
          }
        }
        
        if (event.type === 'nextQuarter' && onQuarterEnd) {
          onQuarterEnd();
        }
        
        if (event.type === 'sync' && onSync) {
          onSync(state);
        }
      });
      
      // Set initial state
      const initialState = timerRef.current.getState();
      setTimeRemaining(timerRef.current.getCurrentTime());
      setIsRunning(initialState.isRunning);
      setCurrentQuarter(initialState.currentQuarter);
      setStatus(initialState.status);
      setFullState(initialState);
      
      return unsubscribe;
    }
  }, [gameId, timerConfig, onTimerExpired, onQuarterEnd, onSync]);

  // Smooth timer display updates using requestAnimationFrame  
  useEffect(() => {
    let animationFrameId: number | null = null;
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE = 100; // Update every 100ms for smooth countdown
    
    const updateDisplay = (timestamp: number) => {
      if (timerRef.current && isRunning) {
        // Throttle updates to avoid excessive renders
        if (timestamp - lastUpdateTime >= UPDATE_THROTTLE) {
          const currentTime = timerRef.current.getCurrentTime();
          setTimeRemaining(currentTime);
          lastUpdateTime = timestamp;
          
          // Check for timer expiration (only if not handled by events)
          if (timerRef.current.isExpired() && onTimerExpired) {
            onTimerExpired();
          }
        }
        
        // Continue animation loop if timer is still running
        animationFrameId = requestAnimationFrame(updateDisplay);
      }
    };
    
    if (isRunning && timerRef.current) {
      animationFrameId = requestAnimationFrame(updateDisplay);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isRunning, onTimerExpired]);

  // Server sync for spectator views (separate from display updates)
  useEffect(() => {
    if (!autoSync || !timerRef.current) return;
    
    const syncWithServer = async () => {
      // This would fetch from server and sync state
      // For now, just ensure local state is current
      const currentTime = timerRef.current!.getCurrentTime();
      setTimeRemaining(currentTime);
      
      if (onSync) {
        onSync(timerRef.current!.getState());
      }
    };
    
    syncIntervalRef.current = setInterval(syncWithServer, syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [autoSync, syncInterval, onSync]);

  // Timer actions
  const start = useCallback(() => {
    if (timerRef.current) {
      timerRef.current.start();
    }
  }, []);

  const pause = useCallback(() => {
    if (timerRef.current) {
      timerRef.current.pause();
    }
  }, []);

  const nextQuarter = useCallback(() => {
    if (timerRef.current) {
      timerRef.current.nextQuarter();
    }
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) {
      timerRef.current.reset();
    }
  }, []);

  const syncWithServer = useCallback((serverState: Partial<TimerState>) => {
    if (timerRef.current) {
      timerRef.current.syncWithState(serverState);
    }
  }, []);

  // Computed values
  const isExpired = timerRef.current?.isExpired() ?? false;
  const isGameFinished = timerRef.current?.isGameFinished() ?? false;

  return {
    // State
    timeRemaining,
    isRunning,
    currentQuarter,
    status,
    isExpired,
    isGameFinished,
    
    // Actions
    start,
    pause,
    nextQuarter,
    reset,
    syncWithServer,
    
    // Debug access
    fullState: fullState || {
      isRunning: false,
      startedAt: null,
      pausedAt: null,
      totalPausedTime: 0,
      quarterLength: timerConfig.quarterLength || 15 * 60,
      currentQuarter: 1,
      gameId,
      status: 'scheduled',
    },
  };
}

/**
 * Hook for spectator view - optimized for minimal updates
 */
export function useSpectatorTimer(gameId: string, config: UseTimerConfig = {}): UseTimerReturn {
  return useTimer(gameId, {
    ...config,
    autoSync: true,
    syncInterval: 3000, // Sync every 3 seconds for spectators
  });
}

/**
 * Hook for admin view - optimized for precise control
 */
export function useAdminTimer(gameId: string, config: UseTimerConfig = {}): UseTimerReturn {
  return useTimer(gameId, {
    ...config,
    autoSync: false, // Admin controls directly, no auto-sync
  });
}
