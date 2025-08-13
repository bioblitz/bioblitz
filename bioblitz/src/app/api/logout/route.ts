import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  // IMPORTANT: Replace 'session' with the actual name of your session cookie.
  const cookieName = 'session'; 

  // Get the session from the cookies to see if it exists.
  const session = (await cookies()).get(cookieName);

  if (!session) {
    // If there's no session, the user is already effectively logged out server-side.
    return NextResponse.json({ message: 'No active session' }, { status: 200 });
  }

  // Clear the session cookie by setting its expiration to a past date.
  (await
        // Clear the session cookie by setting its expiration to a past date.
        cookies()).set(cookieName, '', { httpOnly: true, path: '/', maxAge: 0 });

  return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
}