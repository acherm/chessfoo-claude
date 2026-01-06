import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface GameSession {
  id: string;
  started_at: string;
  completed_at: string | null;
  is_won: boolean;
  total_moves: number;
  duration_seconds: number | null;
  moves: Move[];
}

export interface Move {
  from: { row: number; col: number };
  to: { row: number; col: number };
  piece: 'white' | 'black';
  timestamp: number;
}

export async function createTables() {
  // Create table using Supabase SQL editor or run this SQL manually:
  // For now, we'll use RPC or direct table operations
  // The table should be created via Supabase dashboard SQL editor:
  /*
    CREATE TABLE IF NOT EXISTS game_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      is_won BOOLEAN DEFAULT FALSE,
      total_moves INTEGER DEFAULT 0,
      duration_seconds INTEGER,
      moves JSONB DEFAULT '[]'::jsonb
    );
  */

  // Test connection by selecting from the table
  const { error } = await supabase
    .from('game_sessions')
    .select('id')
    .limit(1);

  if (error && error.code === '42P01') {
    // Table doesn't exist - user needs to create it manually
    throw new Error('Table game_sessions does not exist. Please create it in Supabase dashboard.');
  }

  if (error) {
    throw error;
  }

  return true;
}

export async function createSession(): Promise<string> {
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({ started_at: new Date().toISOString() })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function addMove(sessionId: string, move: Move) {
  // First get current moves
  const { data: session, error: fetchError } = await supabase
    .from('game_sessions')
    .select('moves, total_moves')
    .eq('id', sessionId)
    .single();

  if (fetchError) throw fetchError;

  const currentMoves = session.moves || [];
  const newMoves = [...currentMoves, move];

  const { error } = await supabase
    .from('game_sessions')
    .update({
      moves: newMoves,
      total_moves: session.total_moves + 1,
    })
    .eq('id', sessionId);

  if (error) throw error;
}

export async function completeSession(
  sessionId: string,
  isWon: boolean,
  durationSeconds: number
) {
  const { error } = await supabase
    .from('game_sessions')
    .update({
      completed_at: new Date().toISOString(),
      is_won: isWon,
      duration_seconds: durationSeconds,
    })
    .eq('id', sessionId);

  if (error) throw error;
}

export async function getSession(sessionId: string): Promise<GameSession | null> {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as GameSession;
}

export async function getAllSessions(): Promise<GameSession[]> {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data as GameSession[];
}

export async function getStats() {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('*');

  if (error) throw error;

  const sessions = data || [];
  const wonSessions = sessions.filter(s => s.is_won);

  return {
    total_games: sessions.length.toString(),
    wins: wonSessions.length.toString(),
    avg_moves_to_win: wonSessions.length > 0
      ? (wonSessions.reduce((sum, s) => sum + s.total_moves, 0) / wonSessions.length).toFixed(1)
      : null,
    avg_time_to_win: wonSessions.length > 0
      ? (wonSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / wonSessions.length).toFixed(0)
      : null,
    best_moves: wonSessions.length > 0
      ? Math.min(...wonSessions.map(s => s.total_moves)).toString()
      : null,
    best_time: wonSessions.length > 0
      ? Math.min(...wonSessions.filter(s => s.duration_seconds).map(s => s.duration_seconds!)).toString()
      : null,
  };
}
