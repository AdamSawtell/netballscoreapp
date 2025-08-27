/**
 * Test Timer API - Using new TimerService architecture
 * Integration test for Phase 2 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { TimerService } from '@/lib/services/TimerService';
import { 
  validateAPIAction, 
  validateCreateGameRequest, 
  validateScoreUpdateRequest, 
  validateTimerActionRequest,
  formatValidationError 
} from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { action, gameId, team, points, ...data } = requestData;

    // Validate action first
    const actionResult = validateAPIAction(action);
    if (!actionResult.isValid) {
      return NextResponse.json({ 
        success: false, 
        error: formatValidationError(actionResult.error!, 'action'),
        code: 'VALIDATION_ERROR'
      }, { status: 400 });
    }

    switch (actionResult.sanitized) {
      case 'createGame': {
        const validation = validateCreateGameRequest(data);
        if (!validation.isValid) {
          return NextResponse.json({ 
            success: false, 
            error: validation.error,
            code: 'VALIDATION_ERROR'
          }, { status: 400 });
        }

        const { teamA, teamB, quarterLength } = validation.sanitized!;
        const game = TimerService.createGame(teamA, teamB, { quarterLength });
        
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
        const validation = validateScoreUpdateRequest({ gameId, team, points });
        if (!validation.isValid) {
          return NextResponse.json({ 
            success: false, 
            error: validation.error,
            code: 'VALIDATION_ERROR'
          }, { status: 400 });
        }

        const sanitized = validation.sanitized!;
        const game = TimerService.updateScore(sanitized.gameId, sanitized.team, sanitized.points);
        return NextResponse.json({ 
          success: true, 
          game,
          message: `🏀 ${sanitized.team === 'A' ? game?.teamA : game?.teamB} +${sanitized.points}` 
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
    // Log error with context
    console.error('🚨 Test Timer API Error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      url: request.url,
      method: request.method
    });

    // Determine error type and return appropriate response
    if (error instanceof SyntaxError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON'
      }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('Game not found')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Game not found',
        code: 'GAME_NOT_FOUND'
      }, { status: 404 });
    }

    // Generic server error
    return NextResponse.json({ 
      success: false, 
      error: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : 'Unknown error')
        : 'Internal server error',
      code: 'INTERNAL_ERROR',
      stack: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.stack : undefined)
        : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    
    if (gameId) {
      // Get specific game
      const game = TimerService.getGameWithTimer(gameId);
      if (!game) {
        return NextResponse.json({
          success: false,
          error: 'Game not found'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        game,
        message: `🎮 Game found: ${game.teamA} vs ${game.teamB}`
      });
    } else {
      // Get all games (health check)
      const games = TimerService.getAllGamesWithTimer();
      
      return NextResponse.json({
        success: true,
        games,
        count: games.length,
        timestamp: new Date().toISOString(),
        message: `🔍 API Health Check - ${games.length} games active`
      });
    }
  } catch (error) {
    console.error('Test Timer API GET Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get game data'
    }, { status: 500 });
  }
}
