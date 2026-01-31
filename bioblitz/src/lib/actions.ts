"use server";
import { firestore, auth } from "./firebase";
import { adminAuth, adminFirestore } from "./firebase-admin";
import {
  collection,
  addDoc,
  setDoc,
  doc,
  query,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { gameRoom, Question } from "@/types";
import { revalidatePath } from "next/cache";
import { getUserProfile } from "./user";
import { FieldValue } from "firebase-admin/firestore";

export async function createContest(
  prevState: { message: string },
  formData: FormData,
) {
  const idToken = (formData.get("idToken") as string) || null;

  if (!idToken) {
    return { message: "You must be logged in to create a contest." };
  }

  let uid: string;
  let creatorPfp = "/images/logo.svg";
  let creatorUsername = "";
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
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
  const questions: Question[] = questionsString
    ? JSON.parse(questionsString)
    : [];
  const status = (formData.get("status") as string) || "incomplete";

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
    bannerUrl: (formData.get("bannerUrl") as string) || "",
    creation: null,
  };

  try {
    let savedId: string | null = null;
    if (contestId) {
      await adminFirestore
        .collection("sets")
        .doc(contestId)
        .set(contest, { merge: true });
      savedId = contestId;
      console.log("Document updated with ID: ", contestId);
    } else {
      const ref = await adminFirestore.collection("sets").add(contest);
      savedId = ref.id;
      console.log("Document written with ID: ", ref.id);
    }
    if (status === "completed") {
      await adminFirestore
        .collection("users")
        .doc(uid)
        .set({ publicSetCount: FieldValue.increment(1) }, { merge: true });
    }

    revalidatePath("/contests");
    return { message: `Contest saved with ID: ${savedId}` };
  } catch (e) {
    console.error("Error saving document: ", e);
    return { message: "Failed to save contest" };
  }
}

export async function getContestsByCreator(
  creatorUid: string,
): Promise<gameRoom[]> {
  try {
    const q = query(
      collection(firestore, "sets"),
      where("creator", "==", creatorUid),
    );
    const querySnapshot = await getDocs(q);
    const contests: gameRoom[] = [];

    let creatorBanner: string | undefined;
    let creatorPfp: string | undefined;
    try {
      const creatorProfile = await getUserProfile(creatorUid);
      creatorBanner = creatorProfile?.bannerURL;
      creatorPfp = creatorProfile?.photoURL;
    } catch (e) {
      console.error("Error fetching creator banner:", e);
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const questionCount =
        data.questions && Array.isArray(data.questions)
          ? data.questions.length.toString()
          : data.number_of_questions || data.questionCount?.toString() || "0";
      contests.push({
        id: doc.id,
        ...data,
        number_of_questions: questionCount,
        creatorBanner: data.creatorBanner || creatorBanner,
        creatorPfp: data.creatorPfp || creatorPfp,
        creation: data.creation?.toDate?.()?.getTime() || null,
        lastRatingUpdate: data.lastRatingUpdate?.toDate?.()?.getTime() || null,
        lastPlayedAt: data.lastPlayedAt?.toDate?.()?.getTime() || null,
      } as unknown as gameRoom);
    });
    return contests;
  } catch (e) {
    console.error("Error getting contests by creator: ", e);
    return [];
  }
}

export async function getCompletedContests(): Promise<gameRoom[]> {
  try {
    const q = query(
      collection(firestore, "sets"),
      where("status", "==", "completed"),
    );
    const querySnapshot = await getDocs(q);
    const contests: gameRoom[] = [];

    const creatorBanners = new Map<string, { banner?: string; pfp?: string }>();

    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();

      let creatorBanner: string | undefined;
      let creatorPfp: string | undefined;
      if (data.creator && !creatorBanners.has(data.creator)) {
        try {
          const creatorProfile = await getUserProfile(data.creator);
          creatorBanner = creatorProfile?.bannerURL;
          creatorPfp = creatorProfile?.photoURL;
          creatorBanners.set(data.creator, {
            banner: creatorBanner,
            pfp: creatorPfp,
          });
        } catch (e) {
          console.error("Error fetching creator banner:", e);
          creatorBanners.set(data.creator, {});
        }
      } else {
        const cached = creatorBanners.get(data.creator);
        creatorBanner = cached?.banner;
        creatorPfp = cached?.pfp;
      }

      const questionCount =
        data.questions && Array.isArray(data.questions)
          ? data.questions.length.toString()
          : data.number_of_questions || data.questionCount?.toString() || "0";
      contests.push({
        id: docSnap.id,
        ...data,
        number_of_questions: questionCount,
        creatorBanner: data.creatorBanner || creatorBanner,
        creatorPfp: data.creatorPfp || creatorPfp,
        lastRatingUpdate:
          data.lastRatingUpdate?.toDate?.()?.toISOString() || null,
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

      let creatorBanner: string | undefined;
      let creatorPfp: string | undefined;
      if (data.creator) {
        try {
          const creatorProfile = await getUserProfile(data.creator);
          creatorBanner = creatorProfile?.bannerURL;
          creatorPfp = creatorProfile?.photoURL;
        } catch (e) {
          console.error("Error fetching creator banner:", e);
        }
      }

      const questionCount =
        data.questions && Array.isArray(data.questions)
          ? data.questions.length.toString()
          : data.number_of_questions || data.questionCount?.toString() || "0";
      return {
        id: docSnap.id,
        ...data,
        number_of_questions: questionCount,
        creatorBanner: data.creatorBanner || creatorBanner,
        creatorPfp: data.creatorPfp || creatorPfp,
        lastRatingUpdate:
          data.lastRatingUpdate?.toDate?.()?.toISOString() || null,
        lastPlayedAt: data.lastPlayedAt?.toDate?.()?.toISOString() || null,
      } as gameRoom;
    } else {
      console.log("No such contest document!");
      return null;
    }
  } catch (e) {
    console.error("Error getting contest by ID: ", e);
    return null;
  }
}
