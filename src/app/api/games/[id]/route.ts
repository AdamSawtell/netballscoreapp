import { NextRequest, NextResponse } from 'next/server';
import { GameStorage } from '@/lib/gameStorage';

// GET /api/games/[id] - Get a specific game
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const game = GameStorage.getGame(id);
    
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Ensure spectators get the correct timer value
    const responseGame = {
      ...game,
      // Use lastServerTime if available and timer is running, otherwise use timeRemaining
      timeRemaining: game.isRunning && game.lastServerTime !== undefined 
        ? game.lastServerTime 
        : game.timeRemaining
    };

    return NextResponse.json({ game: responseGame });
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}

// PATCH /api/games/[id] - Update a game
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();
    
    const game = GameStorage.updateGame(id, updates);
    
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, game });
  } catch (error) {
    console.error('Error updating game:', error);
    return NextResponse.json(
      { error: 'Failed to update game' },
      { status: 500 }
    );
  }
}
