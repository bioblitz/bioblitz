import { collection, getDocs, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { firestore } from "./firebase"; 

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

export const allGames = async (topic?: string): Promise<gameRoom[]> => {
  try {
    const gameRoomsCollection = collection(firestore, 'sets');
    const gameRoomSnapshot = await getDocs(gameRoomsCollection);

    let visibleDocs = gameRoomSnapshot.docs.filter(doc => !doc.data().hidden);

    if (topic && topic !== "All Topics") {
      visibleDocs = visibleDocs.filter(doc => doc.data().topic === topic);
    }

 
    const gameList = visibleDocs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();

      return {
        id: doc.id,
        title: data.title || '',
        source: data.source || '',
        
        number_of_questions: (data.questionCount || 0).toString(),
        
        topic: data.topic,
        difficulty: data.difficulty || 'Easy',
        timeLimit: formatTime(parseInt(data.timeLimit || '0', 10)),
        description: data.description,
        creator: data.creator,
        creatorPfp: data.creatorPfp,
        rating: data.averageRating || data.rating, 
        questions: [], 
      };
    });

    return gameList;
    
  } catch (error) {
    console.error("Error fetching game rooms:", error);
    return [];
  }
};