import { Game, CreateGameRequest, DEFAULT_SETTINGS } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';

// Simple in-memory storage for now (will move to database later)
const games = new Map<string, Game>();

export class GameStorage {
  static createGame(request: CreateGameRequest): Game {
    const id = uuidv4();
    const settings = { ...DEFAULT_SETTINGS, ...request.settings };
    
    const game: Game = {
      id,
      teamA: request.teamA,
      teamB: request.teamB,
      scoreA: 0,
      scoreB: 0,
      currentQuarter: 1,
      timeRemaining: settings.quarterLength * 60, // convert minutes to seconds
      quarterLength: settings.quarterLength, // store for display
      status: 'scheduled',
      isRunning: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    games.set(id, game);
    return game;
  }

  static getGame(id: string): Game | null {
    return games.get(id) || null;
  }

  static updateGame(id: string, updates: Partial<Game>): Game | null {
    const game = games.get(id);
    if (!game) return null;

    const updatedGame = {
      ...game,
      ...updates,
      updatedAt: new Date(),
    };

    games.set(id, updatedGame);
    return updatedGame;
  }

  static getAllGames(): Game[] {
    return Array.from(games.values());
  }

  static deleteGame(id: string): boolean {
    return games.delete(id);
  }

  // Helper methods for scoring
  static addScore(id: string, team: 'A' | 'B', points: number = 1): Game | null {
    const game = this.getGame(id);
    if (!game) return null;

    const updates: Partial<Game> = {};
    if (team === 'A') {
      updates.scoreA = Math.max(0, game.scoreA + points);
    } else {
      updates.scoreB = Math.max(0, game.scoreB + points);
    }

    return this.updateGame(id, updates);
  }

  // Timer management
  static startTimer(id: string): Game | null {
    return this.updateGame(id, { 
      isRunning: true, 
      status: 'live' 
    });
  }

  static pauseTimer(id: string): Game | null {
    return this.updateGame(id, { isRunning: false });
  }

  static nextQuarter(id: string): Game | null {
    const game = this.getGame(id);
    if (!game) return null;

    const nextQuarter = game.currentQuarter + 1;
    const isFinished = nextQuarter > DEFAULT_SETTINGS.totalQuarters;

    return this.updateGame(id, {
      currentQuarter: isFinished ? game.currentQuarter : nextQuarter,
      timeRemaining: isFinished ? 0 : game.quarterLength * 60, // use game's quarter length
      status: isFinished ? 'finished' : 'scheduled',
      isRunning: false,
    });
  }

  static endGame(id: string): Game | null {
    return this.updateGame(id, {
      status: 'finished',
      isRunning: false,
      timeRemaining: 0,
    });
  }
}
