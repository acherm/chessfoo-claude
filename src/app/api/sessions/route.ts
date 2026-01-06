import { NextResponse } from 'next/server';
import { createSession, getAllSessions, getStats } from '@/lib/db';

// GET /api/sessions - Get all sessions or stats
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'stats') {
      const stats = await getStats();
      return NextResponse.json(stats);
    }

    const sessions = await getAllSessions();
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create a new session
export async function POST() {
  try {
    const sessionId = await createSession();
    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
