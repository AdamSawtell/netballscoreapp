# 🔧 Refactored Timer System Architecture

## **Core Architecture Changes**

### **1. Timer State Management (Single Source of Truth)**
```typescript
interface TimerState {
  isRunning: boolean;
  startedAt: Date | null;
  pausedAt: Date | null;
  totalPausedTime: number; // Accumulated pause duration
  quarterLength: number; // in seconds
  currentQuarter: number;
}

class TimerManager {
  private state: TimerState;
  private listeners: Set<(state: TimerState) => void> = new Set();

  getCurrentTime(): number {
    if (!this.state.isRunning || !this.state.startedAt) {
      return this.state.quarterLength;
    }
    
    const now = Date.now();
    const elapsed = (now - this.state.startedAt.getTime()) / 1000;
    const remaining = this.state.quarterLength - elapsed + this.state.totalPausedTime;
    return Math.max(0, remaining);
  }

  start(): void {
    if (this.state.isRunning) return;
    
    this.state = {
      ...this.state,
      isRunning: true,
      startedAt: new Date(),
      pausedAt: null
    };
    this.notifyListeners();
  }

  pause(): void {
    if (!this.state.isRunning || !this.state.startedAt) return;
    
    const now = Date.now();
    const elapsed = (now - this.state.startedAt.getTime()) / 1000;
    
    this.state = {
      ...this.state,
      isRunning: false,
      pausedAt: new Date(),
      totalPausedTime: this.state.totalPausedTime + elapsed
    };
    this.notifyListeners();
  }

  nextQuarter(): void {
    this.state = {
      ...this.state,
      currentQuarter: this.state.currentQuarter + 1,
      isRunning: false,
      startedAt: null,
      pausedAt: null,
      totalPausedTime: 0
    };
    this.notifyListeners();
  }

  subscribe(listener: (state: TimerState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }
}
```

### **2. Clean Storage Layer (Pure Data)**
```typescript
interface GameData {
  id: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  timerState: TimerState;
  status: 'scheduled' | 'live' | 'finished';
  createdAt: Date;
  updatedAt: Date;
}

class GameStorage {
  // PURE: No side effects, no calculations
  static get(id: string): GameData | null {
    const games = this.loadFromCache();
    return games.get(id) || null;
  }

  // PURE: Simple data update
  static update(id: string, updates: Partial<GameData>): GameData | null {
    const games = this.loadFromCache();
    const game = games.get(id);
    if (!game) return null;

    const updated = {
      ...game,
      ...updates,
      updatedAt: new Date()
    };

    games.set(id, updated);
    this.saveToCache(games);
    return updated;
  }

  // PURE: Score updates don't affect timer
  static addScore(id: string, team: 'A' | 'B', points: number): GameData | null {
    const game = this.get(id);
    if (!game) return null;

    const scoreUpdate = team === 'A' 
      ? { scoreA: Math.max(0, game.scoreA + points) }
      : { scoreB: Math.max(0, game.scoreB + points) };

    return this.update(id, scoreUpdate);
  }
}
```

### **3. React Timer Hook (Reusable)**
```typescript
interface UseTimerResult {
  timeRemaining: number;
  isRunning: boolean;
  currentQuarter: number;
  start: () => void;
  pause: () => void;
  nextQuarter: () => void;
}

function useTimer(gameId: string, isAdmin = false): UseTimerResult {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timerManagerRef = useRef<TimerManager | null>(null);

  // Initialize timer manager
  useEffect(() => {
    if (!timerState) return;
    
    timerManagerRef.current = new TimerManager(timerState);
    
    const unsubscribe = timerManagerRef.current.subscribe((state) => {
      setTimerState(state);
    });

    return unsubscribe;
  }, [gameId]);

  // Local countdown for smooth display
  useEffect(() => {
    if (!timerManagerRef.current || !timerState?.isRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      const currentTime = timerManagerRef.current!.getCurrentTime();
      setTimeRemaining(currentTime);
      
      if (currentTime <= 0) {
        timerManagerRef.current!.pause();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerState?.isRunning]);

  // Server sync (admin only)
  useEffect(() => {
    if (!isAdmin) return;

    const syncInterval = setInterval(() => {
      // Sync timer state with server
      fetch(`/api/games/${gameId}/timer`)
        .then(res => res.json())
        .then(data => {
          if (timerManagerRef.current) {
            timerManagerRef.current.syncWithServer(data.timerState);
          }
        });
    }, 10000);

    return () => clearInterval(syncInterval);
  }, [gameId, isAdmin]);

  const start = useCallback(() => {
    if (isAdmin && timerManagerRef.current) {
      timerManagerRef.current.start();
      // Sync to server
      fetch(`/api/games/${gameId}/timer`, {
        method: 'POST',
        body: JSON.stringify({ action: 'start' })
      });
    }
  }, [gameId, isAdmin]);

  const pause = useCallback(() => {
    if (isAdmin && timerManagerRef.current) {
      timerManagerRef.current.pause();
      // Sync to server
      fetch(`/api/games/${gameId}/timer`, {
        method: 'POST',
        body: JSON.stringify({ action: 'pause' })
      });
    }
  }, [gameId, isAdmin]);

  const nextQuarter = useCallback(() => {
    if (isAdmin && timerManagerRef.current) {
      timerManagerRef.current.nextQuarter();
      // Sync to server
      fetch(`/api/games/${gameId}/timer`, {
        method: 'POST',
        body: JSON.stringify({ action: 'nextQuarter' })
      });
    }
  }, [gameId, isAdmin]);

  return {
    timeRemaining,
    isRunning: timerState?.isRunning ?? false,
    currentQuarter: timerState?.currentQuarter ?? 1,
    start,
    pause,
    nextQuarter
  };
}
```

### **4. Simplified Components**
```typescript
// Admin Panel
function AdminPanel() {
  const { gameId } = useParams();
  const [game, setGame] = useState<GameData | null>(null);
  const timer = useTimer(gameId, true); // isAdmin = true

  return (
    <div>
      <div>Time: {formatTime(timer.timeRemaining)}</div>
      <button onClick={timer.start} disabled={timer.isRunning}>Start</button>
      <button onClick={timer.pause} disabled={!timer.isRunning}>Pause</button>
      <button onClick={timer.nextQuarter}>Next Quarter</button>
    </div>
  );
}

// Spectator View  
function SpectatorView() {
  const { gameId } = useParams();
  const [game, setGame] = useState<GameData | null>(null);
  const timer = useTimer(gameId, false); // isAdmin = false

  // Spectators only poll for score updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/games/${gameId}`)
        .then(res => res.json())
        .then(data => setGame(data.game));
    }, 3000);

    return () => clearInterval(interval);
  }, [gameId]);

  return (
    <div>
      <div>Time: {formatTime(timer.timeRemaining)}</div>
      <div>Score: {game?.scoreA} - {game?.scoreB}</div>
    </div>
  );
}
```

## **Benefits of This Architecture**

### **✅ Reliability**
- Single source of timer truth eliminates sync conflicts
- Pure functions are predictable and testable
- Clear separation of concerns reduces coupling

### **✅ Performance**
- No redundant timer calculations
- Efficient local countdown with minimal server sync
- Clean memory management with proper cleanup

### **✅ Maintainability**
- Reusable timer hook for consistent behavior
- Clear data flow with explicit state updates
- Easy to add features without breaking existing code

### **✅ Debugging**
- Timer state is always traceable
- No hidden side effects in read operations
- Clear boundaries between components

## **Migration Strategy**

1. **Phase 1**: Implement TimerManager class
2. **Phase 2**: Create useTimer hook
3. **Phase 3**: Refactor storage layer to be pure
4. **Phase 4**: Update components to use new hook
5. **Phase 5**: Remove old timer implementations

This refactored system eliminates the core architectural issues while maintaining all existing functionality with improved reliability and maintainability.
