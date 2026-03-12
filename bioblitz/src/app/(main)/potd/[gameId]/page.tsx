import "server-only";

import PotdGameClient from "./PotdGameClient";
import { notFound } from "next/navigation";
import { getCachedPuzzles, DailyPuzzle } from "@/lib/potd";
import { adminFirestore } from "@/lib/firebase-admin";

export const revalidate = 0; // page itself not cached; archive is cached in getCachedPuzzles()

export default async function PotdGamePage({
  params,
}: {
  params: { gameId: string };
}) {
  const { gameId } = params;

  // 1) Fetch the specific puzzle (server/admin fetch)
  const docSnap = await adminFirestore.collection("potd").doc(gameId).get();

  if (!docSnap.exists) {
    return notFound();
  }

  // 2) Format the single puzzle
  const data = docSnap.data() ?? {};

  // Firestore Admin Timestamp has .toDate()
  let dateString = new Date().toISOString();
  const rawDate = (data as any).date;
  if (rawDate) {
    if (typeof rawDate.toDate === "function") {
      dateString = rawDate.toDate().toISOString();
    } else {
      dateString = new Date(rawDate).toISOString();
    }
  }

  const rawOptions = [
    { key: "a", text: (data as any).a },
    { key: "b", text: (data as any).b },
    { key: "c", text: (data as any).c },
    { key: "d", text: (data as any).d },
    { key: "e", text: (data as any).e },
  ];

  let correctArr: string[] = [];
  const rawCorrect = (data as any).correct;

  if (Array.isArray(rawCorrect)) {
    correctArr = rawCorrect;
  } else if (typeof rawCorrect === "string") {
    correctArr = [rawCorrect];
  } else if (rawCorrect && typeof rawCorrect === "object") {
    correctArr = Object.values(rawCorrect);
  }

  const currentPuzzle: DailyPuzzle = {
    id: docSnap.id,
    title: (data as any).title || "Daily Problem",
    topic: (data as any).topic || "General",
    date: dateString,
    multiSelect: (data as any).multiSelect || false,
    questionText: (data as any).question || "",
    difficulty: (data as any).difficulty || "Medium",
    options: rawOptions.filter((opt) => opt.text),
    correctAnswer: correctArr,
    explanation: (data as any).explanation || "No explanation provided.",
  };

  // 3) Fetch the archive (cached)
  const archivePuzzles = await getCachedPuzzles();

  // 4) Pass both to client
  return (
    <PotdGameClient puzzle={currentPuzzle} archivePuzzles={archivePuzzles} />
  );
}