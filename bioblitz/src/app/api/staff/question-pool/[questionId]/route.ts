import { NextResponse } from "next/server";
import admin, { adminFirestore } from "@/lib/firebase-admin";
import { requireStaffOrAdmin } from "@/lib/adminAccess";
import {
  POOL_COLLECTION,
  buildPoolDocData,
  poolDocToQuestion,
  resolveSetUsage,
} from "@/lib/questionPool";
import { validateEditableQuestion } from "@/lib/questionShape";

export const dynamic = "force-dynamic";

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Unauthorized";
  const status = message === "Forbidden" ? 403 : 401;
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  try {
    await requireStaffOrAdmin(request);
  } catch (err) {
    return errorResponse(err);
  }

  const { questionId } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const question = body?.question || body;
  const errors = validateEditableQuestion({
    id: questionId,
    content: question?.content || "",
    choices: question?.choices || [],
    correctAnswerIds: question?.correctAnswerIds || [],
    isMultiSelect: question?.isMultiSelect,
    solution: question?.solution,
  });
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  try {
    const ref = adminFirestore.collection(POOL_COLLECTION).doc(questionId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const existing = snap.data() as any;
    const next = buildPoolDocData(question);

    // Editing must never reset provenance or usage history.
    const { usedInSetIds: _unused, ...updatable } = next;
    await ref.set(
      {
        ...updatable,
        source: existing.source === "ai" ? "ai" : "manual",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Choice count can shrink; merge would otherwise leave stale letters behind.
    const staleLetters = (["a", "b", "c", "d", "e"] as const).filter(
      (letter) => existing[letter] && updatable[letter] === undefined,
    );
    if (staleLetters.length > 0) {
      const deletions: Record<string, any> = {};
      staleLetters.forEach((letter) => {
        deletions[letter] = admin.firestore.FieldValue.delete();
      });
      await ref.update(deletions);
    }

    const updated = await ref.get();
    const usageBySetId = await resolveSetUsage(
      (updated.data() as any)?.usedInSetIds || [],
    );

    return NextResponse.json({
      question: poolDocToQuestion(updated, usageBySetId),
    });
  } catch (err) {
    console.error("Failed to update pool question:", err);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  try {
    await requireStaffOrAdmin(request);
  } catch (err) {
    return errorResponse(err);
  }

  const { questionId } = await params;
  const force = new URL(request.url).searchParams.get("force") === "true";

  try {
    const ref = adminFirestore.collection(POOL_COLLECTION).doc(questionId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const usedInSetIds: string[] = (snap.data() as any)?.usedInSetIds || [];
    if (usedInSetIds.length > 0 && !force) {
      return NextResponse.json(
        {
          error: `This question is used in ${usedInSetIds.length} set${
            usedInSetIds.length === 1 ? "" : "s"
          }. Deleting it removes it from the pool only; the sets keep their copy.`,
          usedInSetIds,
        },
        { status: 409 },
      );
    }

    await ref.delete();
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error("Failed to delete pool question:", err);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 },
    );
  }
}
