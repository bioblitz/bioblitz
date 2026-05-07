import { NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

function normalizeRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((role) => String(role).toLowerCase().trim())
    .filter(Boolean);
}

function isStaffOrAdminFromClaims(claims: any): boolean {
  const roles = normalizeRoles(claims?.roles);
  return (
    claims?.admin === true ||
    claims?.role === 'admin' ||
    roles.includes('admin') ||
    roles.includes('staff')
  );
}

async function resolveUserByUsername(usernameRaw: string): Promise<string> {
  const username = usernameRaw.trim().toLowerCase();
  if (!username) return '';

  const byUsername = await adminFirestore
    .collection('users')
    .where('username', '==', username)
    .limit(1)
    .get();
  if (!byUsername.empty) return byUsername.docs[0].id;

  const byId = await adminFirestore.collection('users').doc(username).get();
  if (byId.exists) return byId.id;

  return '';
}

export async function GET(request: Request, { params }: { params: Promise<{ contestId: string }> }) {
  try {
    const { contestId } = await params;
    const docRef = adminFirestore.collection('sets').doc(contestId);

    const [contestSnap, questionsSnap] = await Promise.all([
      docRef.get(),
      docRef.collection('questions').get(),
    ]);

    if (!contestSnap.exists) return NextResponse.json(null, { status: 404 });

    const contestData = { id: contestSnap.id, ...contestSnap.data() } as any;

    // Fall back to embedded questions array for blitzes created before subcollection format
    const questions = questionsSnap.docs.length > 0
      ? questionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      : (contestData.questions || []);

    const { questions: _embedded, ...rest } = contestData;
    return NextResponse.json({ ...rest, questions });
  } catch (err) {
    console.error('Error fetching contest:', err);
    return NextResponse.json({ error: 'Failed to fetch contest' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ contestId: string }> }) {
  try {
    const { contestId } = await params;
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid or empty request body' }, { status: 400 });
    }
    const { idToken } = body;
    const postAsUsername = String(body?.postAsUsername || '').trim();

    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let uid: string;
    let decodedClaims: any = null;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      decodedClaims = decoded;
      uid = decoded.uid;
    } catch (e) {
      console.error('Invalid ID token:', e);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (postAsUsername) {
      let allowed = isStaffOrAdminFromClaims(decodedClaims);
      if (!allowed) {
        const actorDoc = await adminFirestore.collection('users').doc(uid).get();
        const actorRoles = normalizeRoles(actorDoc.data()?.roles);
        allowed = actorRoles.includes('admin') || actorRoles.includes('staff');
      }
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const targetUid = await resolveUserByUsername(postAsUsername);
      if (!targetUid) {
        return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
      }
      uid = targetUid;
    }

    const questionsArr: any[] = body.questions || [];

    // Preserve original creator fields when editing an existing contest
    // without an explicit postAsUsername — editing must never re-assign ownership.
    let finalCreatorUid = uid;
    let finalCreatorPfp: string | undefined;
    let finalCreatorUsername: string | undefined;

    const docRef = adminFirestore.collection('sets').doc(contestId);

    if (!postAsUsername) {
      try {
        const existingSnap = await docRef.get();
        if (existingSnap.exists) {
          const existing = existingSnap.data() as any;
          if (existing.creator) {
            finalCreatorUid = existing.creator;
            finalCreatorPfp = existing.creatorPfp;
            finalCreatorUsername = existing.creatorUsername;
          }
        }
      } catch (e) {
        // non-fatal: fall back to current user
      }
    }

    if (finalCreatorPfp === undefined || finalCreatorUsername === undefined) {
      try {
        const userDoc = await adminFirestore.collection('users').doc(finalCreatorUid).get();
        if (userDoc.exists) {
          const data = userDoc.data() as any;
          if (finalCreatorPfp === undefined && data.photoURL) finalCreatorPfp = data.photoURL;
          if (finalCreatorUsername === undefined && data.username) finalCreatorUsername = data.username;
        }
      } catch (e) {
        // ignore
      }
    }

    const contestData: any = {
      title: body.title || '',
      description: body.description || '',
      timeLimit: body.timeLimit || '600',
      topic: body.topic || '',
      number_of_questions: questionsArr.length.toString(),
      status: body.status || 'incomplete',
      incomplete: body.incomplete === true,
      bannerUrl: body.bannerUrl || '',
      creator: finalCreatorUid,
      ...(finalCreatorPfp !== undefined && { creatorPfp: finalCreatorPfp }),
      ...(finalCreatorUsername !== undefined && { creatorUsername: finalCreatorUsername }),
    };

    contestData.tags = Array.isArray(body.tags) ? body.tags.slice() : [];
    if (contestData.incomplete && !contestData.tags.includes('incomplete')) {
      contestData.tags.push('incomplete');
    }
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
    const { idToken, hidden, postAsUsername } = await request.json();
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let uid: string;
    let decodedClaims: any = null;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      decodedClaims = decoded;
      uid = decoded.uid;
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let targetUid = uid;
    if (postAsUsername) {
      let allowed = isStaffOrAdminFromClaims(decodedClaims);
      if (!allowed) {
        const actorDoc = await adminFirestore.collection('users').doc(uid).get();
        const actorRoles = normalizeRoles(actorDoc.data()?.roles);
        allowed = actorRoles.includes('admin') || actorRoles.includes('staff');
      }
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const resolved = await resolveUserByUsername(String(postAsUsername));
      if (!resolved) {
        return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
      }
      targetUid = resolved;
    }

    const docRef = adminFirestore.collection('sets').doc(contestId);
    const snap = await docRef.get();
    if (!snap.exists || snap.data()?.creator !== targetUid) {
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
    const { idToken, postAsUsername } = await request.json();
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let uid: string;
    let decodedClaims: any = null;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      decodedClaims = decoded;
      uid = decoded.uid;
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let targetUid = uid;
    if (postAsUsername) {
      let allowed = isStaffOrAdminFromClaims(decodedClaims);
      if (!allowed) {
        const actorDoc = await adminFirestore.collection('users').doc(uid).get();
        const actorRoles = normalizeRoles(actorDoc.data()?.roles);
        allowed = actorRoles.includes('admin') || actorRoles.includes('staff');
      }
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const resolved = await resolveUserByUsername(String(postAsUsername));
      if (!resolved) {
        return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
      }
      targetUid = resolved;
    }

    const docRef = adminFirestore.collection('sets').doc(contestId);
    const snap = await docRef.get();
    if (!snap.exists || snap.data()?.creator !== targetUid) {
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
