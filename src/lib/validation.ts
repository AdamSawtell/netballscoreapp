/**
 * Validation Utilities
 * Comprehensive input validation and sanitization
 */

export interface ValidationResult<T = unknown> {
  isValid: boolean;
  error?: string;
  sanitized?: T;
}

/**
 * Team name validation
 */
export function validateTeamName(name: unknown): ValidationResult<string> {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Team name is required' };
  }

  const sanitized = name.trim();
  
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Team name cannot be empty' };
  }

  if (sanitized.length > 50) {
    return { isValid: false, error: 'Team name must be 50 characters or less' };
  }

  if (!/^[a-zA-Z0-9\s\-'&.]+$/.test(sanitized)) {
    return { isValid: false, error: 'Team name contains invalid characters' };
  }

  return { isValid: true, sanitized };
}

/**
 * Quarter length validation
 */
export function validateQuarterLength(length: unknown): ValidationResult<number> {
  if (length === null || length === undefined) {
    return { isValid: false, error: 'Quarter length is required' };
  }

  const num = Number(length);
  
  if (isNaN(num) || !isFinite(num)) {
    return { isValid: false, error: 'Quarter length must be a valid number' };
  }

  if (num <= 0) {
    return { isValid: false, error: 'Quarter length must be greater than 0' };
  }

  if (num > 60) {
    return { isValid: false, error: 'Quarter length cannot exceed 60 minutes' };
  }

  // Only allow specific values for netball
  const allowedLengths = [10, 12, 15];
  if (!allowedLengths.includes(num)) {
    return { isValid: false, error: 'Quarter length must be 10, 12, or 15 minutes' };
  }

  return { isValid: true, sanitized: num };
}

/**
 * Score validation
 */
export function validateScore(score: unknown): ValidationResult<number> {
  if (score === null || score === undefined) {
    return { isValid: false, error: 'Score is required' };
  }

  const num = Number(score);
  
  if (isNaN(num) || !isFinite(num)) {
    return { isValid: false, error: 'Score must be a valid number' };
  }

  if (num < 0) {
    return { isValid: false, error: 'Score cannot be negative' };
  }

  if (num > 1000) {
    return { isValid: false, error: 'Score seems unreasonably high (max 1000)' };
  }

  if (!Number.isInteger(num)) {
    return { isValid: false, error: 'Score must be a whole number' };
  }

  return { isValid: true, sanitized: num };
}

/**
 * Game ID validation
 */
export function validateGameId(id: unknown): ValidationResult<string> {
  if (!id || typeof id !== 'string') {
    return { isValid: false, error: 'Game ID is required' };
  }

  const sanitized = id.trim();
  
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Game ID cannot be empty' };
  }

  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sanitized)) {
    return { isValid: false, error: 'Invalid game ID format' };
  }

  return { isValid: true, sanitized };
}

/**
 * Team identifier validation (A or B)
 */
export function validateTeam(team: unknown): ValidationResult<'A' | 'B'> {
  if (!team || typeof team !== 'string') {
    return { isValid: false, error: 'Team identifier is required' };
  }

  const sanitized = team.trim().toUpperCase();
  
  if (!['A', 'B'].includes(sanitized)) {
    return { isValid: false, error: 'Team must be either A or B' };
  }

  return { isValid: true, sanitized: sanitized as 'A' | 'B' };
}

/**
 * Points validation for scoring
 */
export function validatePoints(points: unknown): ValidationResult<number> {
  if (points === null || points === undefined) {
    return { isValid: false, error: 'Points value is required' };
  }

  const num = Number(points);
  
  if (isNaN(num) || !isFinite(num)) {
    return { isValid: false, error: 'Points must be a valid number' };
  }

  if (!Number.isInteger(num)) {
    return { isValid: false, error: 'Points must be a whole number' };
  }

  if (num < -10 || num > 10) {
    return { isValid: false, error: 'Points must be between -10 and 10' };
  }

  return { isValid: true, sanitized: num };
}

/**
 * API action validation
 */
export function validateAPIAction(action: unknown): ValidationResult<string> {
  if (!action || typeof action !== 'string') {
    return { isValid: false, error: 'Action is required' };
  }

  const sanitized = action.trim();
  
  const validActions = [
    'createGame',
    'startTimer', 
    'pauseTimer',
    'nextQuarter',
    'resetTimer',
    'updateScore',
    'getGame',
    'getAllGames',
    'cleanup',
    'saveAllStates'
  ];

  if (!validActions.includes(sanitized)) {
    return { 
      isValid: false, 
      error: `Invalid action. Must be one of: ${validActions.join(', ')}` 
    };
  }

  return { isValid: true, sanitized };
}

/**
 * Comprehensive game creation request validation
 */
export function validateCreateGameRequest(data: unknown): ValidationResult<{
  teamA: string;
  teamB: string;
  quarterLength: number;
}> {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Game data is required' };
  }

  const { teamA, teamB, quarterLength } = data as Record<string, unknown>;

  // Validate team A
  const teamAResult = validateTeamName(teamA);
  if (!teamAResult.isValid) {
    return { isValid: false, error: `Team A: ${teamAResult.error}` };
  }

  // Validate team B  
  const teamBResult = validateTeamName(teamB);
  if (!teamBResult.isValid) {
    return { isValid: false, error: `Team B: ${teamBResult.error}` };
  }

  // Teams cannot be identical
  if (teamAResult.sanitized === teamBResult.sanitized) {
    return { isValid: false, error: 'Team names must be different' };
  }

  // Validate quarter length
  const quarterResult = validateQuarterLength(quarterLength);
  if (!quarterResult.isValid) {
    return { isValid: false, error: quarterResult.error };
  }

  return {
    isValid: true,
    sanitized: {
      teamA: teamAResult.sanitized!,
      teamB: teamBResult.sanitized!,
      quarterLength: quarterResult.sanitized!
    }
  };
}

/**
 * Comprehensive score update request validation
 */
export function validateScoreUpdateRequest(data: unknown): ValidationResult<{
  gameId: string;
  team: 'A' | 'B';
  points: number;
}> {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Score update data is required' };
  }

  const { gameId, team, points } = data as Record<string, unknown>;

  // Validate game ID
  const gameIdResult = validateGameId(gameId);
  if (!gameIdResult.isValid) {
    return { isValid: false, error: gameIdResult.error };
  }

  // Validate team
  const teamResult = validateTeam(team);
  if (!teamResult.isValid) {
    return { isValid: false, error: teamResult.error };
  }

  // Validate points
  const pointsResult = validatePoints(points);
  if (!pointsResult.isValid) {
    return { isValid: false, error: pointsResult.error };
  }

  return {
    isValid: true,
    sanitized: {
      gameId: gameIdResult.sanitized!,
      team: teamResult.sanitized!,
      points: pointsResult.sanitized!
    }
  };
}

/**
 * Timer action request validation
 */
export function validateTimerActionRequest(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Timer action data is required' };
  }

  const { gameId, action } = data as Record<string, unknown>;

  // Validate game ID
  const gameIdResult = validateGameId(gameId);
  if (!gameIdResult.isValid) {
    return { isValid: false, error: gameIdResult.error };
  }

  // Validate action
  const actionResult = validateAPIAction(action);
  if (!actionResult.isValid) {
    return { isValid: false, error: actionResult.error };
  }

  return {
    isValid: true,
    sanitized: {
      gameId: gameIdResult.sanitized,
      action: actionResult.sanitized
    }
  };
}

/**
 * Sanitize and validate HTML content to prevent XSS
 */
export function sanitizeHTML(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content
    .replace(/[<>'"&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[char] || char;
    })
    .trim();
}

/**
 * Rate limiting validation
 */
export function validateRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000
): ValidationResult {
  const now = Date.now();
  const windowKey = `${identifier}:${Math.floor(now / windowMs)}`;
  
  // In a real implementation, you'd use Redis or a proper rate limiting service
  // For now, this is a placeholder that always passes
  return { isValid: true };
}

/**
 * Error message formatter
 */
export function formatValidationError(error: string, field?: string): string {
  const prefix = field ? `${field}: ` : '';
  return `${prefix}${error}`;
}

/**
 * Validation result aggregator
 */
export function aggregateValidationResults(results: ValidationResult[]): ValidationResult {
  const errors = results.filter(r => !r.isValid).map(r => r.error).filter(Boolean);
  
  if (errors.length > 0) {
    return { isValid: false, error: errors.join('. ') };
  }
  
  return { isValid: true };
}
