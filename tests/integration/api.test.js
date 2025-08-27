/**
 * API Integration Tests
 * Tests all API endpoints with real data flows
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

const BASE_URL = 'http://localhost:3000';

describe('API Integration Tests', () => {
  let gameId;
  
  beforeEach(async () => {
    // Create a fresh game for each test
    const response = await fetch(`${BASE_URL}/api/test-timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createGame',
        teamA: 'TestTeamA',
        teamB: 'TestTeamB',
        quarterLength: 10
      })
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    gameId = data.gameId;
    expect(gameId).toBeDefined();
  });

  test('CREATE GAME: Should create game with correct initial state', async () => {
    const response = await fetch(`${BASE_URL}/api/test-timer?gameId=${gameId}`);
    expect(response.ok).toBe(true);
    
    const game = await response.json();
    expect(game.teamA).toBe('TestTeamA');
    expect(game.teamB).toBe('TestTeamB');
    expect(game.scoreA).toBe(0);
    expect(game.scoreB).toBe(0);
    expect(game.isRunning).toBe(false);
    expect(game.timeRemaining).toBe(600); // 10 minutes
    expect(game.status).toBe('scheduled');
  });

  test('TIMER START: Should start timer correctly', async () => {
    // Start timer
    const startResponse = await fetch(`${BASE_URL}/api/test-timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'startTimer',
        gameId: gameId
      })
    });
    
    expect(startResponse.ok).toBe(true);
    
    // Check timer is running
    const gameResponse = await fetch(`${BASE_URL}/api/test-timer?gameId=${gameId}`);
    const game = await gameResponse.json();
    
    expect(game.isRunning).toBe(true);
    expect(game.status).toBe('live');
    expect(game.timeRemaining).toBeLessThanOrEqual(600);
  });

  test('TIMER PAUSE: Should pause timer correctly', async () => {
    // Start timer
    await fetch(`${BASE_URL}/api/test-timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'startTimer',
        gameId: gameId
      })
    });
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Pause timer
    const pauseResponse = await fetch(`${BASE_URL}/api/test-timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'pauseTimer',
        gameId: gameId
      })
    });
    
    expect(pauseResponse.ok).toBe(true);
    
    // Check timer is paused
    const gameResponse = await fetch(`${BASE_URL}/api/test-timer?gameId=${gameId}`);
    const game = await gameResponse.json();
    
    expect(game.isRunning).toBe(false);
    expect(game.status).toBe('scheduled');
    expect(game.timeRemaining).toBeLessThan(600); // Some time should have elapsed
  });

  test('SCORE UPDATE: Should update scores correctly', async () => {
    // Add goal to Team A
    const scoreResponse = await fetch(`${BASE_URL}/api/test-timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addScore',
        gameId: gameId,
        team: 'A',
        points: 1
      })
    });
    
    expect(scoreResponse.ok).toBe(true);
    
    // Check score updated
    const gameResponse = await fetch(`${BASE_URL}/api/test-timer?gameId=${gameId}`);
    const game = await gameResponse.json();
    
    expect(game.scoreA).toBe(1);
    expect(game.scoreB).toBe(0);
  });

  test('STATE PERSISTENCE: Timer state should persist correctly', async () => {
    // Start timer
    await fetch(`${BASE_URL}/api/test-timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'startTimer',
        gameId: gameId
      })
    });
    
    // Wait and pause
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await fetch(`${BASE_URL}/api/test-timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'pauseTimer',
        gameId: gameId
      })
    });
    
    // Get state
    const gameResponse1 = await fetch(`${BASE_URL}/api/test-timer?gameId=${gameId}`);
    const game1 = await gameResponse1.json();
    
    // Simulate restart (create new timer instance)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get state again
    const gameResponse2 = await fetch(`${BASE_URL}/api/test-timer?gameId=${gameId}`);
    const game2 = await gameResponse2.json();
    
    // State should be consistent
    expect(game2.isRunning).toBe(false); // Should NOT be running
    expect(game2.timeRemaining).toBeCloseTo(game1.timeRemaining, 0);
    expect(game2.status).toBe('scheduled'); // Should be scheduled, not live
  });

  test('ERROR HANDLING: Should handle invalid requests gracefully', async () => {
    // Invalid game ID
    const response1 = await fetch(`${BASE_URL}/api/test-timer?gameId=invalid-id`);
    expect(response1.status).toBe(404);
    
    // Invalid action
    const response2 = await fetch(`${BASE_URL}/api/test-timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'invalidAction',
        gameId: gameId
      })
    });
    expect(response2.status).toBe(400);
    
    // Missing required fields
    const response3 = await fetch(`${BASE_URL}/api/test-timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createGame'
        // Missing teamA, teamB, quarterLength
      })
    });
    expect(response3.status).toBe(400);
  });
});
