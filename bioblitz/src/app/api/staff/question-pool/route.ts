import { NextResponse } from "next/server";
import admin, { adminFirestore } from "@/lib/firebase-admin";
import { requireStaffOrAdmin } from "@/lib/adminAccess";
import {
  MAX_POOL_FETCH,
  POOL_COLLECTION,
  PoolQuestionInput,
  buildPoolDocData,
  poolDocToQuestion,
  resolveSetUsage,
} from "@/lib/questionPool";
import { stripHtml, validateEditableQuestion } from "@/lib/questionShape";

export const dynamic = "force-dynamic";

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Unauthorized";
  const status = message === "Forbidden" ? 403 : 401;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    await requireStaffOrAdmin(request);
  } catch (err) {
    return errorResponse(err);
  }

  const url = new URL(request.url);
  const topic = url.searchParams.get("topic")?.trim() || "";
  const difficulty = url.searchParams.get("difficulty")?.trim() || "";
  const source = url.searchParams.get("source")?.trim() || "";
  const usage = url.searchParams.get("usage")?.trim() || "all";
  const search = url.searchParams.get("search")?.trim().toLowerCase() || "";

  try {
    const snap = await adminFirestore
      .collection(POOL_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(MAX_POOL_FETCH)
      .get();

    const setIds = snap.docs.flatMap((doc) => {
      const ids = (doc.data() as any)?.usedInSetIds;
      return Array.isArray(ids) ? ids : [];
    });
    const usageBySetId = await resolveSetUsage(setIds);

    const all = snap.docs.map((doc) => poolDocToQuestion(doc, usageBySetId));

    const questions = all.filter((q) => {
      if (topic && q.topic !== topic) return false;
      if (difficulty && q.difficulty !== difficulty) return false;
      if (source && q.source !== source) return false;
      if (usage === "used" && q.usageCount === 0) return false;
      if (usage === "unused" && q.usageCount > 0) return false;
      if (search) {
        const haystack = [
          stripHtml(q.content),
          q.solution || "",
          q.topic,
          ...q.tags,
          ...q.choices.map((c) => c.text),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    return NextResponse.json({
      questions,
      total: all.length,
      filtered: questions.length,
      truncated: all.length >= MAX_POOL_FETCH,
    });
  } catch (err) {
    console.error("Failed to load question pool:", err);
    return NextResponse.json(
      { error: "Failed to load question pool" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let actor: { uid: string };
  try {
    actor = await requireStaffOrAdmin(request);
  } catch (err) {
    return errorResponse(err);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const incoming: PoolQuestionInput[] = Array.isArray(body?.questions)
    ? body.questions
    : body?.question
      ? [body.question]
      : [];

  if (incoming.length === 0) {
    return NextResponse.json({ error: "No questions provided" }, { status: 400 });
  }

  const problems: string[] = [];
  incoming.forEach((q, idx) => {
    const errors = validateEditableQuestion({
      id: "",
      content: q.content || "",
      choices: q.choices || [],
      correctAnswerIds: q.correctAnswerIds || [],
      isMultiSelect: q.isMultiSelect,
      solution: q.solution,
    });
    errors.forEach((e) => problems.push(`Question ${idx + 1}: ${e}`));
  });

  if (problems.length > 0) {
    return NextResponse.json({ error: problems.join(" ") }, { status: 400 });
  }

  let username = "";
  try {
    const userDoc = await adminFirestore.collection("users").doc(actor.uid).get();
    username = (userDoc.data() as any)?.username || "";
  } catch {
    // non-fatal: attribution is best-effort
  }

  try {
    const createdIds: string[] = [];
    for (let i = 0; i < incoming.length; i += 400) {
      const batch = adminFirestore.batch();
      incoming.slice(i, i + 400).forEach((q) => {
        const ref = adminFirestore.collection(POOL_COLLECTION).doc();
        batch.set(ref, {
          ...buildPoolDocData(q, { uid: actor.uid, username }),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        createdIds.push(ref.id);
      });
      await batch.commit();
    }

    return NextResponse.json({ createdIds, count: createdIds.length });
  } catch (err) {
    console.error("Failed to add questions to pool:", err);
    return NextResponse.json(
      { error: "Failed to add questions to the pool" },
      { status: 500 },
    );
  }
}
