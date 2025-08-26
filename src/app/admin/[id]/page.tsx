'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Game } from '@/types/game';

const ADMIN_PASSWORD = 'netball2025';

export default function AdminPanel() {
  const params = useParams();
  const gameId = params.id as string;
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load game data
  const loadGame = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`);
      if (!response.ok) {
        throw new Error('Game not found');
      }
      const { game } = await response.json();
      setGame(game);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
    }
  };

  // Handle password authentication
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError('');
      loadGame();
    } else {
      setPasswordError('Incorrect password');
    }
  };

  // Update score
  const updateScore = async (team: 'A' | 'B', points: number) => {
    if (!game) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/games/${gameId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team, points }),
      });
      
      if (!response.ok) throw new Error('Failed to update score');
      
      const { game: updatedGame } = await response.json();
      setGame(updatedGame);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update score');
    } finally {
      setLoading(false);
    }
  };

  // Control timer
  const controlTimer = async (action: string) => {
    if (!game) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/games/${gameId}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      if (!response.ok) throw new Error('Failed to control timer');
      
      const { game: updatedGame } = await response.json();
      setGame(updatedGame);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to control timer');
    } finally {
      setLoading(false);
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format game status
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'scheduled': return '⏰ Scheduled';
      case 'live': return '🔴 LIVE';
      case 'break': return '☕ Break';
      case 'finished': return '🏁 Finished';
      default: return status;
    }
  };

  // If not authenticated, show password form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                🔐 Admin Access
              </h1>
              <p className="text-gray-600">
                Enter password to access scoring controls
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                  placeholder="Enter admin password"
                />
              </div>

              {passwordError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {passwordError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-medium"
              >
                Access Admin Panel
              </button>
            </form>

            <div className="mt-4 text-xs text-gray-500 text-center">
              Game ID: {gameId}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated but no game loaded, show loading
  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm max-w-md">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main admin panel
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              🏐 Admin Panel
            </h1>
            <div className="text-sm text-gray-500">
              Game ID: {gameId}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-700">Quarter</div>
              <div className="text-3xl font-bold text-blue-600">Q{game.currentQuarter}</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-700">Time</div>
              <div className="text-3xl font-bold text-green-600">{formatTime(game.timeRemaining)}</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-700">Status</div>
              <div className="text-lg font-bold text-orange-600">{getStatusDisplay(game.status)}</div>
            </div>
          </div>
        </div>

        {/* Scoring Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Team A */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-center mb-4 text-blue-600">{game.teamA}</h2>
            <div className="text-center mb-4">
              <div className="text-5xl font-bold text-gray-900">{game.scoreA}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateScore('A', 1)}
                disabled={loading || game.status === 'finished'}
                className="bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
              >
                +1 Goal
              </button>
              <button
                onClick={() => updateScore('A', -1)}
                disabled={loading || game.status === 'finished' || game.scoreA === 0}
                className="bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
              >
                -1 Goal
              </button>
            </div>
          </div>

          {/* Team B */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-center mb-4 text-purple-600">{game.teamB}</h2>
            <div className="text-center mb-4">
              <div className="text-5xl font-bold text-gray-900">{game.scoreB}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateScore('B', 1)}
                disabled={loading || game.status === 'finished'}
                className="bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
              >
                +1 Goal
              </button>
              <button
                onClick={() => updateScore('B', -1)}
                disabled={loading || game.status === 'finished' || game.scoreB === 0}
                className="bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
              >
                -1 Goal
              </button>
            </div>
          </div>
        </div>

        {/* Timer Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold mb-4 text-center">Timer Controls</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => controlTimer('start')}
              disabled={loading || game.isRunning || game.status === 'finished'}
              className="bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              ▶️ Start
            </button>
            <button
              onClick={() => controlTimer('pause')}
              disabled={loading || !game.isRunning || game.status === 'finished'}
              className="bg-yellow-600 text-white py-3 px-4 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              ⏸️ Pause
            </button>
            <button
              onClick={() => controlTimer('nextQuarter')}
              disabled={loading || game.status === 'finished'}
              className="bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              ⏭️ Next Quarter
            </button>
            <button
              onClick={() => controlTimer('endGame')}
              disabled={loading || game.status === 'finished'}
              className="bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              🏁 End Game
            </button>
          </div>
        </div>

        {/* Viewer Link */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold mb-3">Share with Spectators</h3>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={`${window.location.origin}/game/${gameId}`}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-900"
            />
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/game/${gameId}`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium text-sm"
            >
              Copy Link
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Share this link so spectators can watch the live scores
          </p>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
