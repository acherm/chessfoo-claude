import { Pool } from 'pg';

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';

const pool = new Pool({
  connectionString: connectionString.includes('?')
    ? connectionString
    : `${connectionString}?sslmode=require`,
});

export interface GameSession {
  id: string;
  started_at: Date;
  completed_at: Date | null;
  is_won: boolean;
  total_moves: number;
  duration_seconds: number | null;
  moves: string;
}

export interface Move {
  from: { row: number; col: number };
  to: { row: number; col: number };
  piece: 'white' | 'black';
  timestamp: number;
}

export async function createTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        is_won BOOLEAN DEFAULT FALSE,
        total_moves INTEGER DEFAULT 0,
        duration_seconds INTEGER,
        moves JSONB DEFAULT '[]'::jsonb
      )
    `);
  } finally {
    client.release();
  }
}

export async function createSession(): Promise<string> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO game_sessions (started_at)
      VALUES (NOW())
      RETURNING id
    `);
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

export async function addMove(sessionId: string, move: Move) {
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE game_sessions
      SET moves = moves || $1::jsonb,
          total_moves = total_moves + 1
      WHERE id = $2::uuid
    `, [JSON.stringify(move), sessionId]);
  } finally {
    client.release();
  }
}

export async function completeSession(
  sessionId: string,
  isWon: boolean,
  durationSeconds: number
) {
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE game_sessions
      SET completed_at = NOW(),
          is_won = $1,
          duration_seconds = $2
      WHERE id = $3::uuid
    `, [isWon, durationSeconds, sessionId]);
  } finally {
    client.release();
  }
}

export async function getSession(sessionId: string): Promise<GameSession | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM game_sessions WHERE id = $1::uuid',
      [sessionId]
    );
    return result.rows[0] as GameSession || null;
  } finally {
    client.release();
  }
}

export async function getAllSessions(): Promise<GameSession[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM game_sessions
      ORDER BY started_at DESC
      LIMIT 100
    `);
    return result.rows as GameSession[];
  } finally {
    client.release();
  }
}

export async function getStats() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        COUNT(*) as total_games,
        COUNT(*) FILTER (WHERE is_won = true) as wins,
        AVG(total_moves) FILTER (WHERE is_won = true) as avg_moves_to_win,
        AVG(duration_seconds) FILTER (WHERE is_won = true) as avg_time_to_win,
        MIN(total_moves) FILTER (WHERE is_won = true) as best_moves,
        MIN(duration_seconds) FILTER (WHERE is_won = true) as best_time
      FROM game_sessions
    `);
    return result.rows[0];
  } finally {
    client.release();
  }
}
