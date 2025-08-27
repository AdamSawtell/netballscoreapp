'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';

export default function Home() {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [quarterLength, setQuarterLength] = useState(15); // Default 15 minutes
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [gameCreated, setGameCreated] = useState(false);
  const [gameLinks, setGameLinks] = useState({ admin: '', viewer: '' });
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!teamA.trim() || !teamB.trim()) {
      setError('Please enter both team names');
      return;
    }

    if (teamA.trim() === teamB.trim()) {
      setError('Team names must be different');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/test-timer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createGame',
          teamA: teamA.trim(),
          teamB: teamB.trim(),
          settings: {
            quarterLength: quarterLength
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create game');
      }

      const { game } = await response.json();
      const links = {
        admin: `/admin/${game.id}`,
        viewer: `/game/${game.id}`
      };
      
      // Generate QR code for viewer link
      const viewerUrl = `${window.location.origin}${links.viewer}`;
      const qrDataUrl = await QRCode.toDataURL(viewerUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Show success screen with links and QR code
      setGameLinks(links);
      setQrCodeUrl(qrDataUrl);
      setGameCreated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // If game was created successfully, show success screen
  if (gameCreated) {
  return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Game Created!
            </h1>
            <p className="text-gray-600">
              {teamA} vs {teamB}
            </p>
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-center mb-4">Spectator Access</h3>
            <div className="text-center mb-4">
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code for spectator access" 
                  className="mx-auto border border-gray-200 rounded-lg p-2"
                />
              )}
              <p className="text-sm text-gray-600 mt-3">
                📱 Spectators can scan this QR code to watch live scores
              </p>
              
              {/* QR Code Sharing Buttons */}
              {qrCodeUrl && (
                <div className="flex flex-wrap gap-2 justify-center mt-3">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.download = `netball-game-qr.png`;
                      link.href = qrCodeUrl;
                      link.click();
                    }}
                    className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                  >
                    📥 Download QR
                  </button>
                  
                  <button
                    onClick={async () => {
                      const viewerUrl = gameLinks?.viewer || '';
                      const shareText = `Watch live netball scores!\n${teamA} vs ${teamB}\n\n${viewerUrl}`;
                      
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: `Netball Score App: ${teamA} vs ${teamB}`,
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
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push(gameLinks.admin)}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 font-bold text-lg"
            >
              🏐 Start Scoring
            </button>
            
            <button
              onClick={() => window.open(gameLinks.viewer, '_blank')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
            >
              👀 Preview Spectator View
            </button>
            
            <button
              onClick={() => {
                setGameCreated(false);
                setTeamA('');
                setTeamB('');
                setQuarterLength(15);
                setError('');
              }}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 font-medium"
            >
              Create Another Game
            </button>
          </div>

          {/* Copy Link */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Share Link:</p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={`${window.location.origin}${gameLinks.viewer}`}
                readOnly
                className="flex-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded text-gray-900"
              />
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}${gameLinks.viewer}`)}
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏐 Netball Score App
          </h1>
          <p className="text-gray-600">
            Create a new game to start scoring
          </p>
        </div>

        {/* Game Creation Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="teamA" className="block text-sm font-medium text-gray-700 mb-1">
                Team A
              </label>
              <input
                type="text"
                id="teamA"
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                placeholder="Enter team name"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="teamB" className="block text-sm font-medium text-gray-700 mb-1">
                Team B
              </label>
              <input
                type="text"
                id="teamB"
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                placeholder="Enter team name"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="quarterLength" className="block text-sm font-medium text-gray-700 mb-1">
                Quarter Length (minutes)
              </label>
              <select
                id="quarterLength"
                value={quarterLength}
                onChange={(e) => setQuarterLength(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                disabled={isLoading}
              >
                <option value={10}>10 minutes</option>
                <option value={12}>12 minutes</option>
                <option value={15}>15 minutes</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? 'Creating Game...' : 'Create Game'}
            </button>
          </form>

          {/* Game Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Game Settings</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 4 quarters of {quarterLength} minutes each</li>
              <li>• Live scoring and timer</li>
              <li>• Real-time updates for spectators</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          Simple netball scoring for everyone
        </div>
      </div>
    </div>
  );
}
