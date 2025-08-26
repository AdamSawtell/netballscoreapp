/**
 * Test Timer API - Using new TimerService architecture
 * Integration test for Phase 2 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { TimerService } from '@/lib/services/TimerService';

export async function POST(request: NextRequest) {
  try {
    const { action, gameId, team, points, ...data } = await request.json();

    switch (action) {
      case 'createGame': {
        const { teamA, teamB, quarterLength } = data;
        const game = TimerService.createGame(teamA, teamB, {
          quarterLength: quarterLength || 15
        });
        
        return NextResponse.json({ 
          success: true, 
          game,
          message: `🎉 Game created: ${teamA} vs ${teamB}` 
        });
      }

      case 'startTimer': {
        const game = TimerService.startTimer(gameId);
        return NextResponse.json({ 
          success: true, 
          game,
          message: '▶️ Timer started!' 
        });
      }

      case 'pauseTimer': {
        const game = TimerService.pauseTimer(gameId);
        return NextResponse.json({ 
          success: true, 
          game,
          message: '⏸️ Timer paused!' 
        });
      }

      case 'nextQuarter': {
        const game = TimerService.nextQuarter(gameId);
        return NextResponse.json({ 
          success: true, 
          game,
          message: `🔄 Quarter ${game?.currentQuarter}` 
        });
      }

      case 'resetTimer': {
        const game = TimerService.resetTimer(gameId);
        return NextResponse.json({ 
          success: true, 
          game,
          message: '🔄 Timer reset!' 
        });
      }

      case 'updateScore': {
        const game = TimerService.updateScore(gameId, team, points);
        return NextResponse.json({ 
          success: true, 
          game,
          message: `🏀 ${team === 'A' ? game?.teamA : game?.teamB} +${points}` 
        });
      }

      case 'getGame': {
        const game = TimerService.getGameWithTimer(gameId);
        return NextResponse.json({ 
          success: true, 
          game,
          message: '📊 Game state retrieved' 
        });
      }

      case 'getAllGames': {
        const games = TimerService.getAllGamesWithTimer();
        return NextResponse.json({ 
          success: true, 
          games,
          count: games.length,
          message: `📋 Found ${games.length} games` 
        });
      }

      case 'cleanup': {
        TimerService.cleanupInactiveTimers();
        return NextResponse.json({ 
          success: true, 
          message: '🧹 Cleanup completed' 
        });
      }

      case 'saveAllStates': {
        TimerService.saveAllTimerStates();
        return NextResponse.json({ 
          success: true, 
          message: '💾 All timer states saved' 
        });
      }

      default:
        return NextResponse.json({ 
          success: false, 
          error: `Unknown action: ${action}`,
          availableActions: [
            'createGame', 'startTimer', 'pauseTimer', 'nextQuarter', 
            'resetTimer', 'updateScore', 'getGame', 'getAllGames',
            'cleanup', 'saveAllStates'
          ]
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Test Timer API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const games = TimerService.getAllGamesWithTimer();
    
    return NextResponse.json({
      success: true,
      games,
      count: games.length,
      timestamp: new Date().toISOString(),
      message: `🔍 API Health Check - ${games.length} games active`
    });
  } catch (error) {
    console.error('Test Timer API Health Check Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    }, { status: 500 });
  }
}
