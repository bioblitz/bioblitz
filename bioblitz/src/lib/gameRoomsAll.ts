import { collection, getDocs, QueryDocumentSnapshot, DocumentData, doc, getDoc } from "firebase/firestore";
import { firestore } from "./firebase";
import { gameRoom } from "@/types/index";

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

    let visibleDocs = gameRoomSnapshot.docs.filter(doc => {
      const data = doc.data();
      return !data.hidden && data.status !== "incomplete";
    });

    if (topic && topic !== "All Topics") {
      visibleDocs = visibleDocs.filter(doc => doc.data().topic === topic);
    }

    const creatorCache = new Map<string, { username?: string; banner?: string; pfp?: string }>();

    const gameList = await Promise.all(visibleDocs.map(async (docSnap: QueryDocumentSnapshot<DocumentData>) => {
      const data = docSnap.data();

      let creatorUsername = data.creatorUsername;
      let creatorBanner = data.creatorBanner;
      let creatorPfp = data.creatorPfp;
      
      if (data.creator && !creatorCache.has(data.creator)) {
        try {
          const userDocRef = doc(firestore, "users", data.creator);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            creatorCache.set(data.creator, {
              username: userData.username,
              banner: userData.bannerURL,
              pfp: userData.photoURL,
            });
            creatorUsername = creatorUsername || userData.username;
            creatorBanner = creatorBanner || userData.bannerURL;
            creatorPfp = creatorPfp || userData.photoURL;
          }
        } catch (e) {
          console.error("Error fetching creator data:", e);
        }
      } else if (data.creator && creatorCache.has(data.creator)) {
        const cached = creatorCache.get(data.creator);
        creatorUsername = creatorUsername || cached?.username;
        creatorBanner = creatorBanner || cached?.banner;
        creatorPfp = creatorPfp || cached?.pfp;
      }

      return {
        id: docSnap.id,
        title: data.title || '',
        source: data.source || '',
        number_of_questions: (data.questions && Array.isArray(data.questions) 
          ? data.questions.length 
          : (data.number_of_questions ? parseInt(data.number_of_questions) : (data.questionCount || 0))).toString(),
        topic: data.topic,
        difficulty: data.difficulty || 'Easy',
        timeLimit: formatTime(parseInt(data.timeLimit || '0', 10)),
        description: data.description,
        creator: data.creator,
        creatorPfp,
        creatorUsername,
        creatorBanner,
        rating: data.averageRating || data.rating,
        totalPlays: data.totalPlays || 0,
        bannerUrl: data.bannerUrl,
        questions: [],
        creation: data.creation?.toDate?.()?.getTime() || null,
        lastPlayedAt: data.lastPlayedAt?.toDate?.()?.getTime() || null,
        lastRatingUpdate: data.lastRatingUpdate?.toDate?.()?.getTime() || null,
      };
    }));

    return gameList;
    
  } catch (error) {
    console.error("Error fetching game rooms:", error);
    return [];
  }
};
