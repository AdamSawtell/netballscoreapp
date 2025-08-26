import { NextResponse } from 'next/server';
import { GameStorage } from '@/lib/gameStorage';
import fs from 'fs';
import path from 'path';

// GET /api/debug/storage - Debug storage status
export async function GET() {
  try {
    const storageFile = path.join('/tmp', 'netball-games.json');
    const games = GameStorage.getAllGames();
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      storage: {
        file: storageFile,
        fileExists: fs.existsSync(storageFile),
        fileSize: fs.existsSync(storageFile) ? fs.statSync(storageFile).size : 0,
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
          createdAt: g.createdAt,
          updatedAt: g.updatedAt
        }))
      },
      globalCache: {
        exists: !!(typeof global !== 'undefined' && (global as Record<string, unknown>).gameStorageCache),
        count: typeof global !== 'undefined' && (global as Record<string, unknown>).gameStorageCache 
          ? ((global as Record<string, unknown>).gameStorageCache as Map<string, unknown>).size 
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
