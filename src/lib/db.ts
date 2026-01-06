import { sql } from '@vercel/postgres';

export interface GameSession {
  id: string;
  started_at: Date;
  completed_at: Date | null;
  is_won: boolean;
  total_moves: number;
  duration_seconds: number | null;
  moves: string; // JSON array of moves
}

export interface Move {
  from: { row: number; col: number };
  to: { row: number; col: number };
  piece: 'white' | 'black';
  timestamp: number; // ms since game start
}

export async function createTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      is_won BOOLEAN DEFAULT FALSE,
      total_moves INTEGER DEFAULT 0,
      duration_seconds INTEGER,
      moves JSONB DEFAULT '[]'::jsonb
    )
  `;
}

export async function createSession(): Promise<string> {
  const result = await sql`
    INSERT INTO game_sessions (started_at)
    VALUES (NOW())
    RETURNING id
  `;
  return result.rows[0].id;
}

export async function addMove(sessionId: string, move: Move) {
  await sql`
    UPDATE game_sessions
    SET moves = moves || ${JSON.stringify(move)}::jsonb,
        total_moves = total_moves + 1
    WHERE id = ${sessionId}::uuid
  `;
}

export async function completeSession(
  sessionId: string,
  isWon: boolean,
  durationSeconds: number
) {
  await sql`
    UPDATE game_sessions
    SET completed_at = NOW(),
        is_won = ${isWon},
        duration_seconds = ${durationSeconds}
    WHERE id = ${sessionId}::uuid
  `;
}

export async function getSession(sessionId: string): Promise<GameSession | null> {
  const result = await sql`
    SELECT * FROM game_sessions WHERE id = ${sessionId}::uuid
  `;
  return result.rows[0] as GameSession || null;
}

export async function getAllSessions(): Promise<GameSession[]> {
  const result = await sql`
    SELECT * FROM game_sessions
    ORDER BY started_at DESC
    LIMIT 100
  `;
  return result.rows as GameSession[];
}

export async function getStats() {
  const result = await sql`
    SELECT
      COUNT(*) as total_games,
      COUNT(*) FILTER (WHERE is_won = true) as wins,
      AVG(total_moves) FILTER (WHERE is_won = true) as avg_moves_to_win,
      AVG(duration_seconds) FILTER (WHERE is_won = true) as avg_time_to_win,
      MIN(total_moves) FILTER (WHERE is_won = true) as best_moves,
      MIN(duration_seconds) FILTER (WHERE is_won = true) as best_time
    FROM game_sessions
  `;
  return result.rows[0];
}
