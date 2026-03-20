import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserProfile, createUserProfile, updateUserPhoto, UserProfile } from '@/lib/user';

export async function GET() {
  try {
    const decodedIdToken = await getCurrentUser();
    let userProfile: UserProfile | null = null;

    if (decodedIdToken) {
      userProfile = await getUserProfile(decodedIdToken.uid);

      if (!userProfile) {
        userProfile = await createUserProfile({
          uid: decodedIdToken.uid,
          displayName: decodedIdToken.name || decodedIdToken.email?.split('@')[0] || 'User',
          email: decodedIdToken.email || '',
          photoURL: decodedIdToken.picture || '',
          marketingConsent: false,
          marketingConsentAskedAt: null
        });
      } else {
        const storedIsGoogleUrl = userProfile.photoURL?.includes('googleusercontent.com');
        if (decodedIdToken.picture && (!userProfile.photoURL || storedIsGoogleUrl)) {
          try {
            await updateUserPhoto(decodedIdToken.uid, decodedIdToken.picture);
            userProfile.photoURL = decodedIdToken.picture;
          } catch (err) {
            console.error('Failed to update user photoURL in Firestore:', err);
          }
        }
      }
    }

    return NextResponse.json({ isAuthenticated: !!decodedIdToken, user: userProfile });
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json({ isAuthenticated: false, user: null }, { status: 500 });
  }
}
