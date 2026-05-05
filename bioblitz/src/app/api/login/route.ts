import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { app } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  if (!idToken) {
    return NextResponse.json({ error: 'ID token is missing' }, { status: 400 });
  }

  try {
    const expiresInMs = 60 * 60 * 24 * 14 * 1000; // 14 days in ms (Firebase maximum)
    const sessionCookie = await getAuth(app).createSessionCookie(idToken, { expiresIn: expiresInMs });

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set('session', sessionCookie, {
      maxAge: 60 * 60 * 24 * 14, // 14 days in seconds (cookie spec)
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('Error creating session cookie:', error);
    return NextResponse.json({ error: 'Failed to create session cookie' }, { status: 500 });
  }
}
