'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Game } from '@/types/game';
import QRCode from 'qrcode';

export default function GameViewer() {
  const params = useParams();
  const gameId = params.id as string;
  
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showShareSection, setShowShareSection] = useState(false);
  // No timerRef needed - using server-side authoritative time

  // Load game data - but don't overwrite local timer if it's running
  const loadGame = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`);
      if (!response.ok) {
        throw new Error('Game not found');
      }
      const { game: serverGame } = await response.json();
      
      // Use server data directly - server time is authoritative
      setGame(serverGame);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
    } finally {
      setLoading(false);
    }
  };

  // Generate QR code for sharing this game
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

  // Auto-refresh game data every 3 seconds to get score updates
  useEffect(() => {
    loadGame();
    
    const interval = setInterval(() => {
      // Always refresh to get score updates, but preserve timer state if running
      loadGame();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [gameId]); // Keep simple dependency

  // Server-side timer: No local countdown needed, server calculates authoritative time
  // All devices sync to server time via API polling every 3 seconds

  // No local timer cleanup needed - using server-side time

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format game status
  const getStatusDisplay = (status: string, isRunning: boolean) => {
    switch (status) {
      case 'scheduled': return '⏰ Ready to Start';
      case 'live': return isRunning ? '🔴 LIVE' : '⏸️ PAUSED';
      case 'finished': return '🏁 Game Finished';
      default: return status;
    }
  };

  // Get status color
  const getStatusColor = (status: string, isRunning: boolean) => {
    switch (status) {
      case 'live': return isRunning ? 'text-red-600' : 'text-yellow-600';
      case 'finished': return 'text-gray-600';
      default: return 'text-blue-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Game Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!game) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              🏐 Netball Score App - Live
            </h1>
            <div className={`text-lg md:text-xl font-semibold ${getStatusColor(game.status, game.isRunning)}`}>
              {getStatusDisplay(game.status, game.isRunning)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Main Scoreboard */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-6">
          {/* Teams and Scores */}
          <div className="grid grid-cols-3 gap-4 items-center mb-6">
            {/* Team A */}
            <div className="text-center">
              <h2 className="text-lg md:text-2xl font-bold text-blue-600 mb-2 break-words">
                {game.teamA}
              </h2>
              <div className="text-4xl md:text-6xl font-bold text-gray-900">
                {game.scoreA}
              </div>
            </div>

            {/* VS */}
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold text-gray-400 mb-2">VS</div>
              <div className="text-sm text-gray-500">
                Q{game.currentQuarter} of 4
              </div>
            </div>

            {/* Team B */}
            <div className="text-center">
              <h2 className="text-lg md:text-2xl font-bold text-purple-600 mb-2 break-words">
                {game.teamB}
              </h2>
              <div className="text-4xl md:text-6xl font-bold text-gray-900">
                {game.scoreB}
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="text-center border-t pt-6">
            <div className="text-sm text-gray-600 mb-2">Time Remaining</div>
            <div className="text-3xl md:text-5xl font-bold text-green-600 mb-2">
              {formatTime(game.timeRemaining)}
            </div>
            <div className="flex justify-center items-center space-x-2">
              <span className="text-sm text-gray-500">Quarter {game.currentQuarter}</span>
              {game.isRunning && (
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Game Info */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Game Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-gray-600">Format</div>
              <div className="font-semibold">4 x {game.quarterLength} minute quarters</div>
            </div>
            <div>
              <div className="text-gray-600">Status</div>
              <div className={`font-semibold ${getStatusColor(game.status, game.isRunning)}`}>
                {getStatusDisplay(game.status, game.isRunning)}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Updates</div>
              <div className="font-semibold text-green-600">Live • Auto-refresh</div>
            </div>
          </div>
        </div>

        {/* Share Game Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Share this Game</h3>
            <button
              onClick={() => {
                setShowShareSection(!showShareSection);
                if (!showShareSection && !qrCodeUrl) {
                  generateQRCode();
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              {showShareSection ? '🔼 Hide' : '📤 Share'}
            </button>
          </div>

          {showShareSection && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Invite others to watch this live netball game!
              </p>

              {/* QR Code */}
              {qrCodeUrl && (
                <div className="text-center mb-4">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code to share this game" 
                    className="mx-auto border border-gray-200 rounded-lg p-2"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    📱 Scan to watch live scores
                  </p>
                </div>
              )}

              {/* Sharing Buttons */}
              <div className="flex flex-wrap gap-2 justify-center">
                {qrCodeUrl && (
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.download = `netball-${game?.teamA}-vs-${game?.teamB}-qr.png`;
                      link.href = qrCodeUrl;
                      link.click();
                    }}
                    className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                  >
                    📥 Download QR
                  </button>
                )}
                
                <button
                  onClick={async () => {
                    const viewerUrl = `${window.location.origin}/game/${gameId}`;
                    const shareText = `Watch live netball scores!\n${game?.teamA} vs ${game?.teamB}\n\n${viewerUrl}`;
                    
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: `Netball Score App: ${game?.teamA} vs ${game?.teamB}`,
                          text: shareText
                        });
                      } catch (err) {
                        // Fallback to clipboard
                        navigator.clipboard?.writeText(shareText);
                        alert('Game details copied to clipboard!');
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
                      alert('Game link copied to clipboard!');
                    }
                  }}
                  className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700"
                >
                  🔗 Copy Link
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quarter Summary (if game is finished) */}
        {game.status === 'finished' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Final Result</h3>
            <div className="text-center">
              {game.scoreA > game.scoreB ? (
                <div className="text-xl font-bold text-blue-600">
                  🏆 {game.teamA} wins {game.scoreA} - {game.scoreB}
                </div>
              ) : game.scoreB > game.scoreA ? (
                <div className="text-xl font-bold text-purple-600">
                  🏆 {game.teamB} wins {game.scoreB} - {game.scoreA}
                </div>
              ) : (
                <div className="text-xl font-bold text-gray-600">
                  🤝 Draw {game.scoreA} - {game.scoreB}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Netball Score App • Updates every 2 seconds</p>
          <p className="mt-1">Game ID: {gameId}</p>
        </div>
      </div>
    </div>
  );
}
