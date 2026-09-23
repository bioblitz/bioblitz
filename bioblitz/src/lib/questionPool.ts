import "server-only";

import admin, { adminFirestore } from "@/lib/firebase-admin";
import { EditableQuestion, PoolQuestion, PoolSetUsage } from "@/types";
import {
  QuestionDifficulty,
  StoredQuestion,
  editableToStored,
  normalizeDifficulty,
  normalizeTopic,
  storedToEditable,
  stripHtml,
} from "@/lib/questionShape";

export const POOL_COLLECTION = "questionPool";

/**
 * Pool queries filter and search in memory so no composite indexes are needed.
 * The cap is the number of most-recent questions considered by any one request.
 */
export const MAX_POOL_FETCH = 1000;

export type { PoolQuestion, PoolSetUsage };

export type PoolQuestionInput = {
  content: string;
  imageUrl?: string;
  choices: { id: string; text: string }[];
  correctAnswerIds: string[];
  isMultiSelect?: boolean;
  solution?: string;
  topic?: string;
  difficulty?: string;
  tags?: string[];
  source?: string;
};

/** Firestore document shape: the stored question fields plus pool metadata. */
export type PoolDocData = StoredQuestion & {
  plainText: string;
  topic: string;
  difficulty: QuestionDifficulty;
  tags: string[];
  source: "manual" | "ai";
  usedInSetIds: string[];
  createdBy?: string;
  createdByUsername?: string;
};

export function buildPoolDocData(
  input: PoolQuestionInput,
  actor?: { uid: string; username?: string },
): PoolDocData {
  const editable: EditableQuestion = {
    id: "",
    content: input.content || "",
    imageUrl: input.imageUrl || "",
    choices: (input.choices || []).map((c, idx) => ({
      id: c.id || String(idx + 1),
      text: String(c.text ?? ""),
    })),
    correctAnswerIds: input.correctAnswerIds || [],
    isMultiSelect: input.isMultiSelect === true,
    solution: input.solution || "",
  };

  const stored = editableToStored(editable);
  delete stored.id;

  return {
    ...stored,
    plainText: stripHtml(editable.content).slice(0, 2000),
    topic: normalizeTopic(input.topic),
    difficulty: normalizeDifficulty(input.difficulty),
    tags: Array.isArray(input.tags)
      ? input.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12)
      : [],
    source: input.source === "ai" ? "ai" : "manual",
    usedInSetIds: [],
    ...(actor?.uid ? { createdBy: actor.uid } : {}),
    ...(actor?.username ? { createdByUsername: actor.username } : {}),
  };
}

function toMillis(value: any): number | null {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function poolDocToQuestion(
  doc: FirebaseFirestore.DocumentSnapshot,
  usageBySetId: Map<string, PoolSetUsage>,
): PoolQuestion {
  const data = (doc.data() || {}) as any;
  const editable = storedToEditable(data, doc.id);
  const usedInSetIds: string[] = Array.isArray(data.usedInSetIds)
    ? data.usedInSetIds
    : [];

  return {
    ...editable,
    id: doc.id,
    topic: normalizeTopic(data.topic),
    difficulty: normalizeDifficulty(data.difficulty),
    tags: Array.isArray(data.tags) ? data.tags : [],
    source: data.source === "ai" ? "ai" : "manual",
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    createdBy: data.createdBy || undefined,
    createdByUsername: data.createdByUsername || undefined,
    usageCount: usedInSetIds.length,
    usedIn: usedInSetIds.map(
      (setId) => usageBySetId.get(setId) || { id: setId, title: "Untitled Blitz" },
    ),
  };
}

/** Batch-resolves set titles so usage can be listed and linked per question. */
export async function resolveSetUsage(
  setIds: string[],
): Promise<Map<string, PoolSetUsage>> {
  const unique = Array.from(new Set(setIds.filter(Boolean)));
  const usage = new Map<string, PoolSetUsage>();
  if (unique.length === 0) return usage;

  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 100) {
    chunks.push(unique.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const refs = chunk.map((id) => adminFirestore.collection("sets").doc(id));
    const snaps = await adminFirestore.getAll(...refs);
    snaps.forEach((snap) => {
      if (!snap.exists) return;
      const data = snap.data() as any;
      usage.set(snap.id, {
        id: snap.id,
        title: data.title || "Untitled Blitz",
        status: data.status,
        hidden: data.hidden === true,
      });
    });
  }

  return usage;
}

/** Marks pool questions as used by a set (idempotent). */
export async function recordPoolUsage(
  setId: string,
  questionIds: string[],
): Promise<void> {
  const unique = Array.from(new Set(questionIds.filter(Boolean)));
  if (unique.length === 0) return;

  for (let i = 0; i < unique.length; i += 400) {
    const batch = adminFirestore.batch();
    unique.slice(i, i + 400).forEach((questionId) => {
      batch.set(
        adminFirestore.collection(POOL_COLLECTION).doc(questionId),
        {
          usedInSetIds: admin.firestore.FieldValue.arrayUnion(setId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
    await batch.commit();
  }
}

/** Drops a deleted set from every pool question that references it. */
export async function removeSetFromPoolUsage(setId: string): Promise<void> {
  if (!setId) return;
  const snap = await adminFirestore
    .collection(POOL_COLLECTION)
    .where("usedInSetIds", "array-contains", setId)
    .get();
  if (snap.empty) return;

  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = adminFirestore.batch();
    snap.docs.slice(i, i + 400).forEach((doc) => {
      batch.update(doc.ref, {
        usedInSetIds: admin.firestore.FieldValue.arrayRemove(setId),
      });
    });
    await batch.commit();
  }
}
