import { adminFirestore } from "@/lib/firebase-admin";
import { unstable_cache } from "next/cache";

export interface DailyPuzzle {
  id: string;
  title: string;
  topic: string;
  date: string;
  questionText: string;
  multiSelect: boolean;
  difficulty?: "Easy" | "Medium" | "Hard";
  options: { key: string; text: string }[];
  correctAnswer: string[];
  explanation: string;
  a?: string;
  b?: string;
  c?: string;
  d?: string;
  e?: string;
  correct?: any;
}

function transformDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): DailyPuzzle {
  const data = doc.data();

  let dateString = new Date().toISOString();
  if (data.date) {
    if (typeof data.date.toDate === "function") {
      dateString = data.date.toDate().toISOString();
    } else {
      dateString = new Date(data.date).toISOString();
    }
  }

  const rawOptions = [
    { key: "a", text: data.a },
    { key: "b", text: data.b },
    { key: "c", text: data.c },
    { key: "d", text: data.d },
    { key: "e", text: data.e },
  ];

  let correctArr: string[] = [];
  if (Array.isArray(data.correct)) {
    correctArr = data.correct;
  } else if (typeof data.correct === "string") {
    correctArr = [data.correct];
  } else if (typeof data.correct === "object") {
    correctArr = Object.values(data.correct);
  }

  return {
    id: doc.id,
    title: data.title || "Daily Problem",
    topic: data.topic || "General",
    date: dateString,
    multiSelect: data.multiSelect || false,
    questionText: data.question || "",
    difficulty: data.difficulty || "Medium",
    options: rawOptions.filter((opt) => opt.text),
    correctAnswer: correctArr,
    explanation: data.explanation || "No explanation provided.",
  } as DailyPuzzle;
}

async function fetchAllPuzzles(): Promise<DailyPuzzle[]> {
  const snapshot = await adminFirestore
    .collection("potd")
    .orderBy("date", "desc")
    .limit(10000)
    .get();
  return snapshot.docs.map(transformDoc);
}

export const getCachedPuzzles = unstable_cache(
  fetchAllPuzzles,
  ["daily-puzzles-list"],
  { revalidate: 600 },
);

export const getPuzzles = fetchAllPuzzles;
