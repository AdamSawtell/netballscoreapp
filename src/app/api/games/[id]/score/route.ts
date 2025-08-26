import { NextRequest, NextResponse } from 'next/server';
import { GameStorage } from '@/lib/gameStorage';

// POST /api/games/[id]/score - Update team score
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { team, points = 1 } = await request.json();
    
    if (team !== 'A' && team !== 'B') {
      return NextResponse.json(
        { error: 'Team must be A or B' },
        { status: 400 }
      );
    }

    const game = GameStorage.addScore(id, team, points);
    
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, game });
  } catch (error) {
    console.error('Error updating score:', error);
    return NextResponse.json(
      { error: 'Failed to update score' },
      { status: 500 }
    );
  }
}
