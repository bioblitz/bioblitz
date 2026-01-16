
"use server";
import { firestore, auth } from "./firebase";
import { adminAuth, adminFirestore } from "./firebase-admin";
import { collection, addDoc, setDoc, doc, query, where, getDocs, getDoc } from "firebase/firestore";
import { gameRoom, Question } from "@/types";
import { revalidatePath } from "next/cache";
import { getUserProfile } from "./user";

export async function createContest(prevState: { message: string }, formData: FormData) {
  const idToken = (formData.get("idToken") as string) || null;

  if (!idToken) {
    return { message: "You must be logged in to create a contest." };
  }

  // Verify the ID token on the server using the Admin SDK
  let uid: string;
  let creatorPfp = "/images/logo.svg";
  let creatorUsername = "";
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
    // Try to fetch additional user info
    try {
      const userRecord = await adminAuth.getUser(uid);
      if (userRecord.photoURL) creatorPfp = userRecord.photoURL;
      if (userRecord.displayName) creatorUsername = userRecord.displayName;
    } catch (e) {
      // ignore
    }

    try {
      const userDoc = await adminFirestore.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const data = userDoc.data() as any;
        if (data.photoURL) creatorPfp = data.photoURL;
        if (data.username) creatorUsername = data.username;
      }
    } catch (e) {
      // ignore
    }
  } catch (e) {
    console.error("Invalid ID token:", e);
    return { message: "You must be logged in to create a contest." };
  }

  const contestId = formData.get("contestId") as string | null;
  const questionsString = formData.get("questions") as string;
  const questions: Question[] = questionsString ? JSON.parse(questionsString) : [];
  const status = formData.get("status") as string || "incomplete";

  const contest: Omit<gameRoom, "id"> = {
    title: formData.get("title") as string,
    source: formData.get("source") as string,
    number_of_questions: questions.length.toString(),
    topic: formData.get("topic") as string,
    difficulty: formData.get("difficulty") as string,
    timeLimit: formData.get("timeLimit") as string,
    description: formData.get("description") as string,
    creator: uid,
    creatorPfp: creatorPfp,
    creatorUsername: creatorUsername,
    rating: Number(formData.get("rating")) || 0,
    questions: questions,
    status: status,
    bannerUrl: formData.get("bannerUrl") as string || "",
  };

  try {
    let savedId: string | null = null;
    if (contestId) {
      await adminFirestore.collection("sets").doc(contestId).set(contest, { merge: true });
      savedId = contestId;
      console.log("Document updated with ID: ", contestId);
    } else {
      const ref = await adminFirestore.collection("sets").add(contest);
      savedId = ref.id;
      console.log("Document written with ID: ", ref.id);
    }
    revalidatePath("/contests");
    return { message: `Contest saved with ID: ${savedId}` };
  } catch (e) {
    console.error("Error saving document: ", e);
    return { message: "Failed to save contest" };
  }
}

export async function getContestsByCreator(creatorUid: string): Promise<gameRoom[]> {
  try {
    const q = query(collection(firestore, "sets"), where("creator", "==", creatorUid));
    const querySnapshot = await getDocs(q);
    const contests: gameRoom[] = [];
    
    // Fetch creator's banner once
    let creatorBanner: string | undefined;
    try {
      const creatorProfile = await getUserProfile(creatorUid);
      creatorBanner = creatorProfile?.bannerURL;
    } catch (e) {
      console.error("Error fetching creator banner:", e);
    }
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Calculate number_of_questions from questions array if available
      const questionCount = data.questions && Array.isArray(data.questions) 
        ? data.questions.length.toString() 
        : data.number_of_questions || data.questionCount?.toString() || "0";
      // Serialize the data to remove Timestamp objects and other non-serializable fields
      contests.push({ 
        id: doc.id, 
        ...data,
        number_of_questions: questionCount,
        creatorBanner: data.creatorBanner || creatorBanner,
        // Convert Timestamp to ISO string if it exists
        lastRatingUpdate: data.lastRatingUpdate?.toDate?.()?.toISOString() || null,
        lastPlayedAt: data.lastPlayedAt?.toDate?.()?.toISOString() || null,
      } as gameRoom);
    });
    return contests;
  } catch (e) {
    console.error("Error getting contests by creator: ", e);
    return [];
  }
}

export async function getCompletedContests(): Promise<gameRoom[]> {
  try {
    const q = query(collection(firestore, "sets"), where("status", "==", "completed"));
    const querySnapshot = await getDocs(q);
    const contests: gameRoom[] = [];
    
    // Create a map to cache creator banners
    const creatorBanners = new Map<string, string | undefined>();
    
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      
      // Fetch creator banner if we have a creator and haven't cached it yet
      let creatorBanner: string | undefined;
      if (data.creator && !creatorBanners.has(data.creator)) {
        try {
          const creatorProfile = await getUserProfile(data.creator);
          creatorBanner = creatorProfile?.bannerURL;
          creatorBanners.set(data.creator, creatorBanner);
        } catch (e) {
          console.error("Error fetching creator banner:", e);
          creatorBanners.set(data.creator, undefined);
        }
      } else {
        creatorBanner = creatorBanners.get(data.creator);
      }
      
      // Calculate number_of_questions from questions array if available
      const questionCount = data.questions && Array.isArray(data.questions) 
        ? data.questions.length.toString() 
        : data.number_of_questions || data.questionCount?.toString() || "0";
      // Serialize the data to remove Timestamp objects and other non-serializable fields
      contests.push({ 
        id: docSnap.id, 
        ...data,
        number_of_questions: questionCount,
        creatorBanner: data.creatorBanner || creatorBanner,
        // Convert Timestamp to ISO string if it exists
        lastRatingUpdate: data.lastRatingUpdate?.toDate?.()?.toISOString() || null,
        lastPlayedAt: data.lastPlayedAt?.toDate?.()?.toISOString() || null,
      } as gameRoom);
    }
    return contests;
  } catch (e) {
    console.error("Error getting completed contests: ", e);
    return [];
  }
}

export async function getContestById(id: string): Promise<gameRoom | null> {
  try {
    const docRef = doc(firestore, "sets", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Fetch creator banner
      let creatorBanner: string | undefined;
      if (data.creator) {
        try {
          const creatorProfile = await getUserProfile(data.creator);
          creatorBanner = creatorProfile?.bannerURL;
        } catch (e) {
          console.error("Error fetching creator banner:", e);
        }
      }
      
      // Calculate number_of_questions from questions array if available
      const questionCount = data.questions && Array.isArray(data.questions) 
        ? data.questions.length.toString() 
        : data.number_of_questions || data.questionCount?.toString() || "0";
      // Serialize the data to remove Timestamp objects and other non-serializable fields
      return { 
        id: docSnap.id, 
        ...data,
        number_of_questions: questionCount,
        creatorBanner: data.creatorBanner || creatorBanner,
        // Convert Timestamp to ISO string if it exists
        lastRatingUpdate: data.lastRatingUpdate?.toDate?.()?.toISOString() || null,
        lastPlayedAt: data.lastPlayedAt?.toDate?.()?.toISOString() || null,
      } as gameRoom;
    }
    else {
      console.log("No such contest document!");
      return null;
    }
  } catch (e) {
    console.error("Error getting contest by ID: ", e);
    return null;
  }
}
