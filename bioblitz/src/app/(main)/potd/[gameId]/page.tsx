import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";
import PotdGameClient from "./PotdGameClient";
import { notFound } from "next/navigation";
import { getCachedPuzzles, DailyPuzzle } from "@/lib/potd"; // Import shared fetcher

export const revalidate = 0; // Don't cache the individual lookup page itself (optional)

export default async function PotdGamePage({ params }: { params: { gameId: string } }) {
  const db = getFirestore(app);
  const { gameId } = params;

  // 1. Fetch the specific puzzle (Live fetch)
  const docRef = doc(db, "potd", gameId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return notFound();
  }

  // 2. Format the single puzzle
  const data = docSnap.data();
  let dateString = new Date().toISOString();
  if (data.date) {
      if (typeof data.date.toDate === 'function') {
        dateString = data.date.toDate().toISOString();
      } else {
        dateString = new Date(data.date).toISOString();
      }
  }

  const rawOptions = [
      { key: 'a', text: data.a },
      { key: 'b', text: data.b },
      { key: 'c', text: data.c },
      { key: 'd', text: data.d },
      { key: 'e', text: data.e },
  ];
  
  let correctArr: string[] = [];
  if (Array.isArray(data.correct)) {
      correctArr = data.correct;
  } else if (typeof data.correct === 'string') {
      correctArr = [data.correct];
  } else if (typeof data.correct === 'object') {
      correctArr = Object.values(data.correct);
  }

  const currentPuzzle: DailyPuzzle = {
    id: docSnap.id,
    title: data.title || "Daily Problem",
    topic: data.topic || "General",
    date: dateString,
    multiSelect: data.multiSelect || false,
    questionText: data.question || "",
    difficulty: data.difficulty || "Medium",
    options: rawOptions.filter(opt => opt.text),
    correctAnswer: correctArr,
    explanation: data.explanation || "No explanation provided."
  };

  // 3. FETCH THE ARCHIVE (Cached)
  const archivePuzzles = await getCachedPuzzles();

  // 4. Pass both to client
  return <PotdGameClient puzzle={currentPuzzle} archivePuzzles={archivePuzzles} />;
}