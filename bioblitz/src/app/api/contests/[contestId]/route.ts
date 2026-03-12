import { NextResponse } from 'next/server';
import { getContestById } from '@/lib/actions';
import { adminAuth, adminFirestore } from '@/lib/firebase-admin';

export async function GET(request: Request, { params }: { params: Promise<{ contestId: string }> }) {
  try {
    const { contestId } = await params;
    const contest = await getContestById(contestId);
    if (!contest) return NextResponse.json(null, { status: 404 });

    const questionsSnap = await adminFirestore
      .collection('sets')
      .doc(contestId)
      .collection('questions')
      .get();

    // Fall back to embedded questions array for blitzes created before subcollection format
    const questions = questionsSnap.docs.length > 0
      ? questionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      : ((contest as any).questions || []);

    const { questions: _embedded, ...contestData } = contest as any;
    return NextResponse.json({ ...contestData, questions });
  } catch (err) {
    console.error('Error fetching contest:', err);
    return NextResponse.json({ error: 'Failed to fetch contest' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ contestId: string }> }) {
  try {
    const { contestId } = await params;
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

    const questionsArr: any[] = body.questions || [];

    const contestData: any = {
      title: body.title || '',
      description: body.description || '',
      timeLimit: body.timeLimit || '600',
      topic: body.topic || '',
      number_of_questions: questionsArr.length.toString(),
      status: body.status || 'incomplete',
      incomplete: body.incomplete === true,
      bannerUrl: body.bannerUrl || '',
      creator: uid,
    };

    contestData.tags = Array.isArray(body.tags) ? body.tags.slice() : [];
    if (contestData.incomplete && !contestData.tags.includes('incomplete')) {
      contestData.tags.push('incomplete');
    }

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

    const docRef = adminFirestore.collection('sets').doc(contestId);
    await docRef.set(contestData, { merge: true });

    if (questionsArr.length > 0) {
      const questionsColRef = docRef.collection('questions');
      const existing = await questionsColRef.get();
      await Promise.all(existing.docs.map((d) => d.ref.delete()));
      await Promise.all(
        questionsArr.map((q: any) => {
          const { id, ...qData } = q;
          return questionsColRef.doc(id || questionsColRef.doc().id).set(qData);
        })
      );
    }

    return NextResponse.json({ message: 'Draft saved' });
  } catch (err) {
    console.error('Error in POST /api/contests/[contestId]:', err);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ contestId: string }> }) {
  try {
    const { contestId } = await params;
    const { idToken, hidden } = await request.json();
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const docRef = adminFirestore.collection('sets').doc(contestId);
    const snap = await docRef.get();
    if (!snap.exists || snap.data()?.creator !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await docRef.update({ hidden: Boolean(hidden) });
    return NextResponse.json({ message: 'Updated' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update visibility' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ contestId: string }> }) {
  try {
    const { contestId } = await params;
    const { idToken } = await request.json();
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const docRef = adminFirestore.collection('sets').doc(contestId);
    const snap = await docRef.get();
    if (!snap.exists || snap.data()?.creator !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete questions subcollection first
    const questionsSnap = await docRef.collection('questions').get();
    await Promise.all(questionsSnap.docs.map((d) => d.ref.delete()));
    await docRef.delete();

    return NextResponse.json({ message: 'Deleted' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
