import {collection, doc, setDoc, getDocs, QueryDocumentSnapshot, DocumentData} from "firebase/firestore";
import { firestore } from "./firebase";
import { gameRoom, Question } from "@/types";

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

    // Filter out documents where 'hidden' is true
    let visibleDocs = gameRoomSnapshot.docs.filter(doc => !doc.data().hidden);

    // Further filter by topic if a topic is provided and is not 'All Topics'
    if (topic && topic !== "All Topics") {
      visibleDocs = visibleDocs.filter(doc => doc.data().topic === topic);
    }

    // Use Promise.all to handle the async operations on the filtered list
    const gameList = await Promise.all(
      visibleDocs.map(async (doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();

        // Get a reference to the 'questions' subcollection for the current game
        const questionsCollection = collection(firestore, 'sets', doc.id, 'questions');
        
        // Fetch the subcollection and get its size (the number of questions)
        const questionsSnapshot = await getDocs(questionsCollection);
        const questions = questionsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})) as Question[];
        const questionCount = questionsSnapshot.size;

        return {
          id: doc.id,
          title: data.title || '',
          source: data.source || '',
          // Use the dynamically counted number of questions
          number_of_questions: questionCount.toString(),
          topic: data.topic,
          difficulty: data.difficulty || 'Easy',
          // Use the time formatting function
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
