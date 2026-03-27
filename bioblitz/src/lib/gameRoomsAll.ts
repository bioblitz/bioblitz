import { collection, getDocs, QueryDocumentSnapshot, DocumentData, doc, getDoc, query, orderBy, limit, startAfter } from "firebase/firestore";
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

const PAGE_SIZE = 20;

const transformDoc = async (
  docSnap: QueryDocumentSnapshot<DocumentData>,
  creatorCache: Map<string, { username?: string; banner?: string; pfp?: string }>
): Promise<gameRoom> => {
  const data = docSnap.data();
  let creatorUsername = data.creatorUsername;
  let creatorBanner = data.creatorBanner;
  let creatorPfp = data.creatorPfp;

  if (data.creator) {
    if (!creatorCache.has(data.creator)) {
      try {
        const userDoc = await getDoc(doc(firestore, "users", data.creator));
        if (userDoc.exists()) {
          const u = userDoc.data();
          creatorCache.set(data.creator, { username: u.username, banner: u.bannerURL, pfp: u.photoURL });
        } else {
          creatorCache.set(data.creator, {});
        }
      } catch {
        creatorCache.set(data.creator, {});
      }
    }
    const cached = creatorCache.get(data.creator)!;
    creatorUsername = creatorUsername || cached.username;
    creatorBanner = creatorBanner || cached.banner;
    creatorPfp = creatorPfp || cached.pfp;
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
    firstAttemptCount: data.firstAttemptCount || 0,
    ratingActivated: data.ratingActivated || false,
    bannerUrl: data.bannerUrl,
    questions: [],
    creation: data.creation?.toDate?.()?.getTime() || null,
    lastPlayedAt: data.lastPlayedAt?.toDate?.()?.getTime() || null,
    lastRatingUpdate: data.lastRatingUpdate?.toDate?.()?.getTime() || null,
  };
};

export const getGamesPage = async (
  cursor: QueryDocumentSnapshot<DocumentData> | null = null
): Promise<{ games: gameRoom[]; lastSnap: QueryDocumentSnapshot<DocumentData> | null }> => {
  try {
    const col = collection(firestore, 'sets');
    const q = cursor
      ? query(col, orderBy('trendingScore', 'desc'), startAfter(cursor), limit(PAGE_SIZE))
      : query(col, orderBy('trendingScore', 'desc'), limit(PAGE_SIZE));

    const snapshot = await getDocs(q);
    const visibleDocs = snapshot.docs.filter(d => {
      const data = d.data();
      return !data.hidden && data.status !== 'incomplete';
    });

    const creatorCache = new Map<string, { username?: string; banner?: string; pfp?: string }>();
    const games = await Promise.all(visibleDocs.map(d => transformDoc(d, creatorCache)));
    const lastSnap = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

    return { games, lastSnap };
  } catch (error) {
    console.error("Error fetching games page:", error);
    return { games: [], lastSnap: null };
  }
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
        ratingCount:
          data.ratingCount ??
          data.ratingsCount ??
          data.totalRatings ??
          data.reviewCount ??
          null,
        totalPlays: data.totalPlays || 0,
        firstAttemptCount: data.firstAttemptCount || 0,
        ratingActivated: data.ratingActivated || false,
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
