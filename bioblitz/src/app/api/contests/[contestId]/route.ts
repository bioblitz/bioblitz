import { NextResponse } from 'next/server';
import { getContestById } from '@/lib/actions';
import { adminAuth, adminFirestore } from '@/lib/firebase-admin';

async function saveDraftToFirestore(contestId: string, data: any) {
  try {
    const docRef = adminFirestore.collection('sets').doc(contestId);
    await docRef.set(data, { merge: true });
    return true;
  } catch (e) {
    console.error('Error saving draft to Firestore:', e);
    return false;
  }
}

export async function GET(request: Request, { params }: { params: { contestId: string } }) {
  try {
    const contest = await getContestById(params.contestId);
    if (!contest) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(contest);
  } catch (err) {
    console.error('Error fetching contest:', err);
    return NextResponse.json({ error: 'Failed to fetch contest' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { contestId: string } }) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch (e) {
      console.error('Invalid ID token:', e);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contestData: any = {
      title: body.title || '',
      description: body.description || '',
      timeLimit: body.timeLimit || '600',
      topic: body.topic || '',
      questions: body.questions || [],
      status: body.status || 'incomplete',
      incomplete: body.incomplete === true,
      bannerUrl: body.bannerUrl || '',
      creator: uid,
    };

    // add tags array and include 'incomplete' tag when appropriate
    contestData.tags = Array.isArray(body.tags) ? body.tags.slice() : [];
    if (contestData.incomplete && !contestData.tags.includes('incomplete')) {
      contestData.tags.push('incomplete');
    }

    // try to get user profile info from users collection
    try {
      const userDoc = await adminFirestore.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const data = userDoc.data() as any;
        if (data.photoURL) contestData.creatorPfp = data.photoURL;
        if (data.username) contestData.creatorUsername = data.username;
      }
    } catch (e) {
      // ignore
    }

    const success = await saveDraftToFirestore(params.contestId, contestData);
    if (!success) return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    return NextResponse.json({ message: 'Draft saved' });
  } catch (err) {
    console.error('Error in POST /api/contests/[contestId]:', err);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}
