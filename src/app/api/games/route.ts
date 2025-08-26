import { NextRequest, NextResponse } from 'next/server';
import { GameStorage } from '@/lib/gameStorage';
import { CreateGameRequest } from '@/types/game';

// POST /api/games - Create a new game
export async function POST(request: NextRequest) {
  try {
    const body: CreateGameRequest = await request.json();
    
    // Validate input
    if (!body.teamA || !body.teamB) {
      return NextResponse.json(
        { error: 'Team names are required' },
        { status: 400 }
      );
    }

    if (body.teamA.trim() === body.teamB.trim()) {
      return NextResponse.json(
        { error: 'Team names must be different' },
        { status: 400 }
      );
    }

    const game = GameStorage.createGame({
      teamA: body.teamA.trim(),
      teamB: body.teamB.trim(),
      settings: body.settings,
    });

    return NextResponse.json({
      success: true,
      game,
      links: {
        admin: `/admin/${game.id}`,
        viewer: `/game/${game.id}`,
      }
    });

  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}

// GET /api/games - Get all games (for debugging)
export async function GET() {
  try {
    const games = GameStorage.getAllGames();
    return NextResponse.json({ games });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}
