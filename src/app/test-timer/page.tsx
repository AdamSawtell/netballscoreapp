'use client';

/**
 * Test Timer Integration Page
 * Validates new TimerService + useTimer architecture
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminTimer } from '@/hooks/useTimer';

interface TestGame {
  id: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  currentQuarter: number;
  timeRemaining: number;
  isRunning: boolean;
  status: 'scheduled' | 'live' | 'finished';
  isExpired: boolean;
  isGameFinished: boolean;
}

interface ApiResponse {
  success: boolean;
  game?: TestGame;
  games?: TestGame[];
  message?: string;
  error?: string;
}

export default function TestTimerPage() {
  const [gameId, setGameId] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allGames, setAllGames] = useState<TestGame[]>([]);

  // Use our new useTimer hook
  const timer = useAdminTimer(gameId || 'dummy', {
    quarterLength: 5, // 5 minutes for quick testing
    onTimerExpired: () => addLog('🔔 Timer expired!'),
    onQuarterEnd: () => addLog('🏁 Quarter ended!'),
  });

  // Get current game data for display
  const currentGame = allGames.find(g => g.id === gameId);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const callApi = useCallback(async (action: string, data: Record<string, unknown> = {}) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, gameId, ...data }),
      });

      const result: ApiResponse = await response.json();
      
      if (result.success) {
        addLog(`✅ ${result.message || action}`);
        if (result.game) {
          setGameId(result.game.id);
        }
      } else {
        addLog(`❌ Error: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`💥 API Error: ${errorMsg}`);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  const loadAllGames = useCallback(async () => {
    const result = await callApi('getAllGames');
    if (result.success && result.games) {
      setAllGames(result.games);
    }
  }, [callApi]);

  useEffect(() => {
    loadAllGames();
  }, [loadAllGames]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-600">
          🧪 Timer System Integration Test
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Game Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">🎮 Current Game</h2>
            
            {gameId ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-lg font-semibold mb-2">
                    {currentGame?.teamA || 'Team A'} vs {currentGame?.teamB || 'Team B'}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Score: {currentGame?.scoreA || 0} - {currentGame?.scoreB || 0}</div>
                    <div>Quarter: {timer.currentQuarter}/4</div>
                    <div>Status: {timer.status}</div>
                    <div>Running: {timer.isRunning ? '▶️' : '⏸️'}</div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-4xl font-mono font-bold text-blue-600 mb-2">
                    {formatTime(timer.timeRemaining)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {timer.isExpired ? '⏰ Expired' : timer.isGameFinished ? '🏁 Finished' : '⏱️ Active'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => callApi('startTimer')}
                    disabled={isLoading || timer.isRunning || timer.isExpired}
                    className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300"
                  >
                    ▶️ Start
                  </button>
                  <button
                    onClick={() => callApi('pauseTimer')}
                    disabled={isLoading || !timer.isRunning}
                    className="px-4 py-2 bg-yellow-500 text-white rounded disabled:bg-gray-300"
                  >
                    ⏸️ Pause
                  </button>
                  <button
                    onClick={() => callApi('nextQuarter')}
                    disabled={isLoading || timer.isGameFinished}
                    className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
                  >
                    ⏭️ Next Quarter
                  </button>
                  <button
                    onClick={() => callApi('resetTimer')}
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-500 text-white rounded disabled:bg-gray-300"
                  >
                    🔄 Reset
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => callApi('updateScore', { team: 'A', points: 1 })}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
                  >
                    +1 {currentGame?.teamA || 'Team A'}
                  </button>
                  <button
                    onClick={() => callApi('updateScore', { team: 'B', points: 1 })}
                    disabled={isLoading}
                    className="px-4 py-2 bg-purple-500 text-white rounded disabled:bg-gray-300"
                  >
                    +1 {currentGame?.teamB || 'Team B'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                No game selected. Create a new game below.
              </div>
            )}
          </div>

          {/* Controls Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">🎛️ Test Controls</h2>
            
            <div className="space-y-4">
              <button
                onClick={() => callApi('createGame', { 
                  teamA: 'Warriors', 
                  teamB: 'Eagles',
                  quarterLength: 5 // 5 minute quarters for testing
                })}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-300"
              >
                🆕 Create Test Game (5min quarters)
              </button>

              <button
                onClick={() => callApi('createGame', { 
                  teamA: 'Lions', 
                  teamB: 'Sharks',
                  quarterLength: 1 // 1 minute quarters for quick testing
                })}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300"
              >
                ⚡ Create Quick Game (1min quarters)
              </button>

              <button
                onClick={loadAllGames}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded disabled:bg-gray-300"
              >
                📋 Refresh All Games
              </button>

              <button
                onClick={() => callApi('cleanup')}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded disabled:bg-gray-300"
              >
                🧹 Cleanup Timers
              </button>

              <button
                onClick={() => callApi('saveAllStates')}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded disabled:bg-gray-300"
              >
                💾 Save All States
              </button>
            </div>

            {/* All Games List */}
            <div className="mt-6">
              <h3 className="font-semibold mb-2">All Games ({allGames.length})</h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {allGames.map(game => (
                  <div
                    key={game.id}
                    onClick={() => setGameId(game.id)}
                    className={`p-2 text-xs rounded cursor-pointer ${
                      game.id === gameId ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">{game.teamA} vs {game.teamB}</div>
                    <div className="text-gray-600">
                      {game.scoreA}-{game.scoreB} | Q{game.currentQuarter} | {formatTime(game.timeRemaining)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="mt-6 bg-black text-green-400 rounded-lg shadow-lg p-4">
          <h2 className="text-lg font-bold mb-2">📝 Activity Log</h2>
          <div className="font-mono text-sm max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No activity yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h2 className="text-lg font-bold mb-2 text-gray-800">🔍 Debug Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Current Game ID:</strong> {gameId || 'None'}
            </div>
            <div>
              <strong>Hook Status:</strong> {timer.isRunning ? 'Running' : 'Stopped'}
            </div>
            <div>
              <strong>Time Remaining:</strong> {timer.timeRemaining}s
            </div>
            <div>
              <strong>Quarter:</strong> {timer.currentQuarter}/4
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
