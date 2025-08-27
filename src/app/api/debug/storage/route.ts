import { NextResponse } from 'next/server';
import { TimerService } from '@/lib/services/TimerService';
import fs from 'fs';
import path from 'path';

// GET /api/debug/storage - Debug storage status
export async function GET() {
  try {
    const storageFile = path.join(process.cwd(), '.games-data-cache.json');
    const timerFile = path.join(process.cwd(), '.timer-data-cache.json');
    const games = TimerService.getAllGamesWithTimer();
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      storage: {
        gameFile: storageFile,
        timerFile: timerFile,
        gameFileExists: fs.existsSync(storageFile),
        timerFileExists: fs.existsSync(timerFile),
        gameFileSize: fs.existsSync(storageFile) ? fs.statSync(storageFile).size : 0,
        timerFileSize: fs.existsSync(timerFile) ? fs.statSync(timerFile).size : 0,
        isWritable: await testWriteAccess(storageFile)
      },
      games: {
        count: games.length,
        gameIds: games.map(g => g.id),
        gameDetails: games.map(g => ({
          id: g.id,
          teams: `${g.teamA} vs ${g.teamB}`,
          status: g.status,
          isRunning: g.isRunning,
          currentQuarter: g.currentQuarter,
          timeRemaining: g.timeRemaining,
          isExpired: g.isExpired,
          isGameFinished: g.isGameFinished,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt
        }))
      },
      newStorageSystem: {
        gameDataCache: !!(typeof global !== 'undefined' && (global as Record<string, unknown>).gameDataCache),
        timerDataCache: !!(typeof global !== 'undefined' && (global as Record<string, unknown>).timerDataCache),
        gameCount: typeof global !== 'undefined' && (global as Record<string, unknown>).gameDataCache 
          ? ((global as Record<string, unknown>).gameDataCache as Map<string, unknown>).size 
          : 0,
        timerCount: typeof global !== 'undefined' && (global as Record<string, unknown>).timerDataCache 
          ? ((global as Record<string, unknown>).timerDataCache as Map<string, unknown>).size 
          : 0
      }
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Debug failed', 
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function testWriteAccess(filePath: string): Promise<boolean> {
  try {
    const testFile = filePath + '.test';
    fs.writeFileSync(testFile, '{}');
    fs.unlinkSync(testFile);
    return true;
  } catch {
    return false;
  }
}
