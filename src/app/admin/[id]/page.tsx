'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAdminTimer } from '@/hooks/useTimer';
import { TimerErrorBoundary } from '@/components/ErrorBoundary';
import QRCode from 'qrcode';

const ADMIN_PASSWORD = 'netball2025';

interface GameDisplayData {
  id: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  quarterLength: number;
}

export default function AdminPanel() {
  const params = useParams();
  const gameId = params.id as string;
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [gameData, setGameData] = useState<GameDisplayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Use our new timer system
  const timer = useAdminTimer(gameId, {
    quarterLength: gameData?.quarterLength ? gameData.quarterLength * 60 : 600, // Convert minutes to seconds
    onTimerExpired: () => {
      console.log('Quarter ended!');
      // Could show notification or auto-advance quarter
    },
    onQuarterEnd: () => {
      console.log('Moving to next quarter');
    }
  });

  // Load game data using new TimerService API
  const loadGame = useCallback(async () => {
    try {
      const response = await fetch(`/api/test-timer?gameId=${gameId}`);
      if (!response.ok) {
        throw new Error('Game not found');
      }
      const { game } = await response.json();
      
      // Extract display data (scores, teams) - timer state handled by useAdminTimer
      setGameData({
        id: game.id,
        teamA: game.teamA,
        teamB: game.teamB,
        scoreA: game.scoreA,
        scoreB: game.scoreB,
        quarterLength: game.quarterLength
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
    }
  }, [gameId]);

  // Generate QR code for viewer link
  const generateQRCode = async () => {
    try {
      const viewerUrl = `${window.location.origin}/game/${gameId}`;
      const qrDataUrl = await QRCode.toDataURL(viewerUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrDataUrl);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  };

  // Generate QR code when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      generateQRCode();
    }
  }, [isAuthenticated, gameId]);

  // Load game data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadGame();
    }
  }, [isAuthenticated, loadGame]);



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

  // Update score using new TimerService API
  const updateScore = async (team: 'A' | 'B', points: number) => {
    if (!gameData) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/test-timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'addScore',
          gameId,
          team,
          points
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update score');
      
      const { game: updatedGame } = await response.json();
      // Update game data display (timer state automatically handled by useAdminTimer)
      setGameData({
        id: updatedGame.id,
        teamA: updatedGame.teamA,
        teamB: updatedGame.teamB,
        scoreA: updatedGame.scoreA,
        scoreB: updatedGame.scoreB,
        quarterLength: updatedGame.quarterLength
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update score');
    } finally {
      setLoading(false);
    }
  };

  // Timer control functions using new useAdminTimer hook
  const startTimer = () => {
    console.log('🚨 START BUTTON CLICKED!');
    console.log('Timer state:', {
      isRunning: timer.isRunning,
      isExpired: timer.isExpired,
      isGameFinished: timer.isGameFinished,
      timeRemaining: timer.timeRemaining,
      status: timer.status
    });
    timer.start();
  };

  const pauseTimer = () => {
    timer.pause();
  };

  const nextQuarter = () => {
    timer.nextQuarter();
  };

  const resetTimer = () => {
    timer.reset();
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
      case 'scheduled': return '⏰ Ready';
      case 'live': return '🔴 LIVE';
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
  if (!gameData) {
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
    <TimerErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              🏐 Netball Score App - Admin
            </h1>
            <div className="text-sm text-gray-500">
              Game ID: {gameId}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-700">Quarter</div>
              <div className="text-3xl font-bold text-blue-600">Q{timer.currentQuarter}</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-700">Time</div>
              <div className="text-3xl font-bold text-green-600">{formatTime(timer.timeRemaining)}</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-700">Status</div>
              <div className="text-lg font-bold text-orange-600">{getStatusDisplay(timer.status)}</div>
            </div>
          </div>
        </div>

        {/* Scoring Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Team A */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-center mb-4 text-blue-600">{gameData?.teamA || 'Team A'}</h2>
            <div className="text-center mb-4">
              <div className="text-5xl font-bold text-gray-900">{gameData?.scoreA || 0}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateScore('A', 1)}
                disabled={loading || timer.isGameFinished}
                className="bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
              >
                +1 Goal
              </button>
              <button
                onClick={() => updateScore('A', -1)}
                disabled={loading || timer.isGameFinished || (gameData?.scoreA || 0) === 0}
                className="bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
              >
                -1 Goal
              </button>
            </div>
          </div>

          {/* Team B */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-center mb-4 text-purple-600">{gameData?.teamB || 'Team B'}</h2>
            <div className="text-center mb-4">
              <div className="text-5xl font-bold text-gray-900">{gameData?.scoreB || 0}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateScore('B', 1)}
                disabled={loading || timer.isGameFinished}
                className="bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
              >
                +1 Goal
              </button>
              <button
                onClick={() => updateScore('B', -1)}
                disabled={loading || timer.isGameFinished || (gameData?.scoreB || 0) === 0}
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
              onClick={startTimer}
              disabled={loading || timer.isRunning || timer.isGameFinished || timer.isExpired}
              className="bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              ▶️ Start {loading || timer.isRunning || timer.isGameFinished || timer.isExpired ? '(DISABLED)' : '(ENABLED)'}
            </button>
            <button
              onClick={pauseTimer}
              disabled={loading || !timer.isRunning || timer.isGameFinished}
              className="bg-yellow-600 text-white py-3 px-4 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              ⏸️ Pause
            </button>
            <button
              onClick={nextQuarter}
              disabled={loading || timer.isGameFinished || (timer.isRunning && timer.timeRemaining > 0)}
              className="bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              ⏭️ Next Quarter
            </button>
            <button
              onClick={resetTimer}
              disabled={loading || timer.isGameFinished}
              className="bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              🔄 Reset Timer
            </button>
          </div>
        </div>

        {/* Viewer Link & QR Code */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4">Share with Spectators</h3>
          
          {/* QR Code */}
          {qrCodeUrl && (
            <div className="text-center mb-6">
              <img 
                src={qrCodeUrl} 
                alt="QR Code for spectator access" 
                className="mx-auto border border-gray-200 rounded-lg p-2"
              />
              <p className="text-sm text-gray-600 mt-2">
                📱 Scan with phone camera to view live scores
              </p>
              
              {/* QR Code Sharing Buttons */}
              <div className="flex flex-wrap gap-2 justify-center mt-3">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = `netball-game-${gameId}-qr.png`;
                    link.href = qrCodeUrl;
                    link.click();
                  }}
                  className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                >
                  📥 Download QR
                </button>
                
                <button
                  onClick={async () => {
                    const viewerUrl = `${window.location.origin}/game/${gameId}`;
                    const shareText = `Watch live netball scores!\n${gameData?.teamA} vs ${gameData?.teamB}\n\n${viewerUrl}`;
                    
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: `Netball: ${gameData?.teamA} vs ${gameData?.teamB}`,
                          text: shareText
                        });
                      } catch (err) {
                        // Fallback to clipboard
                        navigator.clipboard?.writeText(shareText);
                        alert('Link copied to clipboard!');
                      }
                    } else if (navigator.clipboard) {
                      await navigator.clipboard.writeText(shareText);
                      alert('Game details copied to clipboard!');
                    }
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                >
                  📤 Share Game
                </button>
                
                <button
                  onClick={async () => {
                    const viewerUrl = `${window.location.origin}/game/${gameId}`;
                    if (navigator.clipboard) {
                      await navigator.clipboard.writeText(viewerUrl);
                      alert('Viewer link copied to clipboard!');
                    }
                  }}
                  className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700"
                >
                  🔗 Copy Link
                </button>
              </div>
            </div>
          )}
          
          {/* Share Link */}
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
            Share this link or QR code so spectators can watch the live scores
          </p>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
        </div>
      </div>
    </TimerErrorBoundary>
  );
}
