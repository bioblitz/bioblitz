import { collection, getDocs, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { firestore } from "./firebase"; // Ensure this path is correct based on your project structure

// --- 1. DEFINE AND EXPORT THE TYPES HERE ---
export type Question = {
  id: string;
  a?: string;
  b?: string;
  c?: string;
  d?: string;
  e?: string;
  content?: string;
  imgURL?: string;
  [key: string]: any;
};

export type gameRoom = {
  id: string;
  title: string;
  source: string;
  number_of_questions: string;
  topic: string;
  difficulty: string;
  timeLimit: string;
  description?: string;
  creator?: string;
  creatorPfp?: string;
  rating?: number;
  questions: Question[];
};

/**
 * Converts a total number of seconds into a "minutes and seconds" string.
 * @param {number} totalSeconds - The total time in seconds.
 * @returns {string} A formatted string, e.g., "2 min 30 sec".
 */
const formatTime = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return "0 sec";
  }
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    if (seconds > 0) {
      return `${minutes} min ${seconds} sec`;
    }
    return `${minutes} min`;
  }
  
  return `${seconds} sec`;
};


/**
 * Fetches all game rooms from the Firestore database and counts their questions.
 * @returns A promise that resolves to an array of gameRoom objects.
 */
export const allGames = async (topic?: string): Promise<gameRoom[]> => {
  try {
    const gameRoomsCollection = collection(firestore, 'sets');
    const gameRoomSnapshot = await getDocs(gameRoomsCollection);

    let visibleDocs = gameRoomSnapshot.docs.filter(doc => !doc.data().hidden);

    if (topic && topic !== "All Topics") {
      visibleDocs = visibleDocs.filter(doc => doc.data().topic === topic);
    }

    const gameList = await Promise.all(
      visibleDocs.map(async (doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();

        const questionsCollection = collection(firestore, 'sets', doc.id, 'questions');
        
        const questionsSnapshot = await getDocs(questionsCollection);
        const questions = questionsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as Question[];
        const questionCount = questionsSnapshot.size;

        return {
          id: doc.id,
          title: data.title || '',
          source: data.source || '',
          number_of_questions: questionCount.toString(),
          topic: data.topic,
          difficulty: data.difficulty || 'Easy',
          timeLimit: formatTime(parseInt(data.timeLimit || '0', 10)),
          description: data.description,
          creator: data.creator,
          creatorPfp: data.creatorPfp,
          rating: data.rating,
          questions: questions,
        };
      })
    );

    return gameList;
    
  } catch (error) {
    console.error("Error fetching game rooms:", error);
    return [];
  }
};