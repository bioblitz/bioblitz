import { NextResponse } from 'next/server';
import admin, { adminFirestore } from '@/lib/firebase-admin';
import { getCurrentUser } from '@/lib/auth';
import type { UserProfile } from '@/lib/user';

function buildFallbackProfile(decodedIdToken: Awaited<ReturnType<typeof getCurrentUser>>): UserProfile {
  if (!decodedIdToken) {
    throw new Error('Cannot build profile without a decoded token');
  }

  return {
    uid: decodedIdToken.uid,
    username: null,
    displayName: decodedIdToken.name || decodedIdToken.email?.split('@')[0] || 'User',
    email: decodedIdToken.email || '',
    photoURL: decodedIdToken.picture || '',
    bElo: 500,
    buElo: 0,
    muElo: 0,
    mElo: 0,
    bio: '',
    location: '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    nameChangedAt: admin.firestore.FieldValue.serverTimestamp(),
    subscriberCount: 0,
    marketingConsent: false,
  };
}

async function loadUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await adminFirestore.collection('users').doc(uid).get();

  if (!snapshot.exists) {
    return null;
  }

  return {
    uid,
    ...(snapshot.data() as Omit<UserProfile, 'uid'>),
  };
}

export async function GET() {
  try {
    const decodedIdToken = await getCurrentUser();
    let userProfile: UserProfile | null = null;

    if (decodedIdToken) {
      const userRef = adminFirestore.collection('users').doc(decodedIdToken.uid);
      userProfile = await loadUserProfile(decodedIdToken.uid);

      if (!userProfile) {
        const newUserProfile = buildFallbackProfile(decodedIdToken);
        await userRef.set(newUserProfile);
        userProfile = await loadUserProfile(decodedIdToken.uid);
      } else {
        if (decodedIdToken.picture && !userProfile.photoURL) {
          userProfile = {
            ...userProfile,
            photoURL: decodedIdToken.picture,
          };
        }
      }
    }

    return NextResponse.json({ isAuthenticated: !!decodedIdToken, user: userProfile });
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json({ isAuthenticated: false, user: null }, { status: 500 });
  }
}
