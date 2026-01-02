import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { app } from "@/lib/firebase"; // Your firebase config
import { unstable_cache } from "next/cache";

// Define the shape of the data
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
  a?: string; b?: string; c?: string; d?: string; e?: string; // Raw fields
  correct?: any;
}

// THE CACHED FUNCTION
export const getCachedPuzzles = unstable_cache(
  async () => {
    const db = getFirestore(app);
    const q = query(
      collection(db, "potd"),
      orderBy("date", "desc"),
      limit(10000)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();

      // Serialize Date
      let dateString = new Date().toISOString();
      if (data.date) {
        if (typeof data.date.toDate === "function") {
          dateString = data.date.toDate().toISOString();
        } else {
          dateString = new Date(data.date).toISOString();
        }
      }

      // Format Options
      const rawOptions = [
        { key: "a", text: data.a },
        { key: "b", text: data.b },
        { key: "c", text: data.c },
        { key: "d", text: data.d },
        { key: "e", text: data.e },
      ];

      // Format Correct Answers
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
    });
  },
  ["daily-puzzles-list"], // Cache Key
  { revalidate: 3600 }    // Revalidate every 1 hour
);