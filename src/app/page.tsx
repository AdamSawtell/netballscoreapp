'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
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
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamA: teamA.trim(),
          teamB: teamB.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create game');
      }

      const { links } = await response.json();
      
      // Redirect to admin panel
      router.push(links.admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏐 Netball Scorer
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter team name"
                disabled={isLoading}
              />
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
              <li>• 4 quarters of 15 minutes each</li>
              <li>• 3 minute breaks between quarters</li>
              <li>• Live scoring and timer</li>
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
