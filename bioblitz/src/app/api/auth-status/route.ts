import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserProfile, createUserProfile, UserProfile } from '@/lib/user';

export async function GET() {
  try {
    const decodedIdToken = await getCurrentUser();
    let userProfile: UserProfile | null = null;

    if (decodedIdToken) {
      userProfile = await getUserProfile(decodedIdToken.uid);

      if (!userProfile) {
        // If user profile doesn't exist, create a basic one
        userProfile = await createUserProfile({
          uid: decodedIdToken.uid,
          displayName: decodedIdToken.name || decodedIdToken.email?.split('@')[0] || 'User',
          email: decodedIdToken.email || '',
          photoURL: decodedIdToken.picture || '',
        });
      }
    }

    return NextResponse.json({ isAuthenticated: !!decodedIdToken, user: userProfile });
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json({ isAuthenticated: false, user: null }, { status: 500 });
  }
}
