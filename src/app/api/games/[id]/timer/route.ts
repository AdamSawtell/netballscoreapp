import { NextRequest, NextResponse } from 'next/server';
import { GameStorage } from '@/lib/gameStorage';

// POST /api/games/[id]/timer - Control game timer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await request.json();
    
    let game;
    
    switch (action) {
      case 'start':
        game = GameStorage.startTimer(id);
        break;
      case 'pause':
        game = GameStorage.pauseTimer(id);
        break;
      case 'nextQuarter':
        game = GameStorage.nextQuarter(id);
        break;
      case 'endGame':
        game = GameStorage.endGame(id);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, pause, nextQuarter, or endGame' },
          { status: 400 }
        );
    }
    
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, game });
  } catch (error) {
    console.error('Error controlling timer:', error);
    return NextResponse.json(
      { error: 'Failed to control timer' },
      { status: 500 }
    );
  }
}
