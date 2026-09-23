import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import admin, { adminFirestore } from "@/lib/firebase-admin";
import { requireStaffOrAdmin } from "@/lib/adminAccess";
import {
  MAX_POOL_FETCH,
  POOL_COLLECTION,
  recordPoolUsage,
} from "@/lib/questionPool";
import { normalizeDifficulty, normalizeTopic } from "@/lib/questionShape";

export const dynamic = "force-dynamic";

const MIN_QUESTIONS = 3;

type PoolPick = {
  id: string;
  data: FirebaseFirestore.DocumentData;
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function dominant(values: string[], fallback: string): string {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  let best = fallback;
  let bestCount = 0;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });
  return best;
}

async function resolveUserByUsername(usernameRaw: string): Promise<string> {
  const username = usernameRaw.trim().toLowerCase();
  if (!username) return "";

  const byUsername = await adminFirestore
    .collection("users")
    .where("username", "==", username)
    .limit(1)
    .get();
  if (!byUsername.empty) return byUsername.docs[0].id;

  const byId = await adminFirestore.collection("users").doc(username).get();
  return byId.exists ? byId.id : "";
}

async function pickManual(questionIds: string[]): Promise<PoolPick[]> {
  const picks: PoolPick[] = [];
  for (let i = 0; i < questionIds.length; i += 100) {
    const refs = questionIds
      .slice(i, i + 100)
      .map((id) => adminFirestore.collection(POOL_COLLECTION).doc(id));
    const snaps = await adminFirestore.getAll(...refs);
    snaps.forEach((snap) => {
      if (snap.exists) picks.push({ id: snap.id, data: snap.data() || {} });
    });
  }
  // Preserve the order the staff member selected them in.
  const order = new Map(questionIds.map((id, idx) => [id, idx]));
  return picks.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

async function pickAuto(
  filters: any,
  count: number,
): Promise<PoolPick[]> {
  const snap = await adminFirestore
    .collection(POOL_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(MAX_POOL_FETCH)
    .get();

  const topic = String(filters?.topic || "").trim();
  const difficulty = String(filters?.difficulty || "").trim();
  const source = String(filters?.source || "").trim();
  const usage = String(filters?.usage || "all").trim();

  const matching = snap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() || {} }))
    .filter(({ data }) => {
      if (topic && normalizeTopic(data.topic) !== topic) return false;
      if (difficulty && normalizeDifficulty(data.difficulty) !== difficulty)
        return false;
      if (source && (data.source === "ai" ? "ai" : "manual") !== source)
        return false;
      const used = Array.isArray(data.usedInSetIds) && data.usedInSetIds.length > 0;
      if (usage === "unused" && used) return false;
      if (usage === "used" && !used) return false;
      return true;
    });

  return shuffle(matching).slice(0, count);
}

export async function POST(request: Request) {
  let actor: { uid: string };
  try {
    actor = await requireStaffOrAdmin(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    const status = message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const title = String(body?.title || "").trim();
  if (!title) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }

  const mode = body?.mode === "auto" ? "auto" : "manual";
  const publish = body?.publish === true;
  const description = String(body?.description || "").trim();
  const timeLimit = String(Number(body?.timeLimit) > 0 ? Math.floor(Number(body.timeLimit)) : 600);
  const postAsUsername = String(body?.postAsUsername || "").trim();

  let picks: PoolPick[];
  try {
    if (mode === "auto") {
      const requested = Number(body?.count);
      const count =
        Number.isFinite(requested) && requested > 0
          ? Math.min(100, Math.floor(requested))
          : 10;
      picks = await pickAuto(body?.filters, count);
      if (picks.length < count) {
        return NextResponse.json(
          {
            error: `Only ${picks.length} pool question${
              picks.length === 1 ? "" : "s"
            } match those filters — asked for ${count}.`,
          },
          { status: 400 },
        );
      }
    } else {
      const questionIds: string[] = Array.isArray(body?.questionIds)
        ? body.questionIds.map((id: unknown) => String(id)).filter(Boolean)
        : [];
      if (questionIds.length === 0) {
        return NextResponse.json(
          { error: "Select at least one question." },
          { status: 400 },
        );
      }
      picks = await pickManual(questionIds);
      if (picks.length !== questionIds.length) {
        return NextResponse.json(
          { error: "Some selected questions no longer exist in the pool." },
          { status: 409 },
        );
      }
    }
  } catch (err) {
    console.error("Failed to select pool questions:", err);
    return NextResponse.json(
      { error: "Failed to read the question pool" },
      { status: 500 },
    );
  }

  if (publish && picks.length < MIN_QUESTIONS) {
    return NextResponse.json(
      { error: `A published blitz needs at least ${MIN_QUESTIONS} questions.` },
      { status: 400 },
    );
  }

  let creatorUid = actor.uid;
  if (postAsUsername) {
    const resolved = await resolveUserByUsername(postAsUsername);
    if (!resolved) {
      return NextResponse.json({ error: "Target user not found." }, { status: 404 });
    }
    creatorUid = resolved;
  }

  let creatorPfp = "/images/logo.svg";
  let creatorUsername = "";
  try {
    const userDoc = await adminFirestore.collection("users").doc(creatorUid).get();
    const data = (userDoc.data() || {}) as any;
    if (data.photoURL) creatorPfp = data.photoURL;
    if (data.username) creatorUsername = data.username;
  } catch {
    // non-fatal: fall back to defaults
  }

  // An empty topic means "derive it from the questions"; an explicit one wins.
  const requestedTopic = String(body?.topic || "").trim();
  const topic = requestedTopic
    ? normalizeTopic(requestedTopic)
    : dominant(
        picks.map((p) => normalizeTopic(p.data.topic)),
        "Multiple",
      );

  const difficulty = dominant(
    picks.map((p) => normalizeDifficulty(p.data.difficulty)),
    "Medium",
  );

  try {
    const setRef = adminFirestore.collection("sets").doc();

    await setRef.set({
      title,
      description,
      source: "Question pool",
      topic,
      difficulty,
      timeLimit,
      number_of_questions: picks.length.toString(),
      status: publish ? "completed" : "incomplete",
      incomplete: !publish,
      tags: publish ? [] : ["incomplete"],
      hidden: !publish,
      bannerUrl: "",
      creator: creatorUid,
      creatorPfp,
      creatorUsername,
      rating: 0,
      isAiGenerated: picks.some((p) => p.data.source === "ai"),
      creation: admin.firestore.FieldValue.serverTimestamp(),
      poolQuestionIds: picks.map((p) => p.id),
    });

    const questionsColRef = setRef.collection("questions");
    for (let i = 0; i < picks.length; i += 400) {
      const batch = adminFirestore.batch();
      picks.slice(i, i + 400).forEach(({ id, data }) => {
        const {
          plainText: _plainText,
          topic: _topic,
          difficulty: _difficulty,
          tags: _tags,
          source: _source,
          usedInSetIds: _usedInSetIds,
          createdAt: _createdAt,
          updatedAt: _updatedAt,
          createdBy: _createdBy,
          createdByUsername: _createdByUsername,
          ...question
        } = data as any;
        batch.set(questionsColRef.doc(id), { ...question, poolQuestionId: id });
      });
      await batch.commit();
    }

    await recordPoolUsage(setRef.id, picks.map((p) => p.id));

    if (publish) {
      await adminFirestore
        .collection("users")
        .doc(creatorUid)
        .set(
          { publicSetCount: admin.firestore.FieldValue.increment(1) },
          { merge: true },
        );
      revalidatePath("/contests");
    }

    return NextResponse.json({
      setId: setRef.id,
      questionCount: picks.length,
      published: publish,
    });
  } catch (err) {
    console.error("Failed to create set from pool:", err);
    return NextResponse.json(
      { error: "Failed to create the set" },
      { status: 500 },
    );
  }
}
