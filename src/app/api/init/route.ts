import { NextResponse } from 'next/server';
import { createTables } from '@/lib/db';

// GET /api/init - Initialize database tables
export async function GET() {
  try {
    await createTables();
    return NextResponse.json({ success: true, message: 'Tables created successfully' });
  } catch (error) {
    console.error('Error creating tables:', error);
    return NextResponse.json(
      { error: 'Failed to create tables', details: String(error) },
      { status: 500 }
    );
  }
}
