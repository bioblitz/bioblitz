
"use server";
import { firestore, auth } from "./firebase";
import { collection, addDoc, setDoc, doc, query, where, getDocs, getDoc } from "firebase/firestore";
import { gameRoom, Question } from "@/types";
import { revalidatePath } from "next/cache";

export async function createContest(prevState: { message: string }, formData: FormData) {
  const user = auth.currentUser;

  if (!user) {
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
    creator: user.uid,
    creatorPfp: user.photoURL || "/images/logo.svg",
    rating: Number(formData.get("rating")) || 0,
    questions: questions,
    status: status,
    bannerUrl: formData.get("bannerUrl") as string || "",
  };

  try {
    let docRef;
    if (contestId) {
      docRef = doc(firestore, "sets", contestId);
      await setDoc(docRef, contest, { merge: true });
      console.log("Document updated with ID: ", contestId);
    } else {
      docRef = await addDoc(collection(firestore, "sets"), contest);
      console.log("Document written with ID: ", docRef.id);
    }
    revalidatePath("/contests");
    return { message: `Contest saved with ID: ${docRef.id}` };
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
    querySnapshot.forEach((doc) => {
      contests.push({ id: doc.id, ...doc.data() } as gameRoom);
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
    querySnapshot.forEach((doc) => {
      contests.push({ id: doc.id, ...doc.data() } as gameRoom);
    });
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
      return { id: docSnap.id, ...docSnap.data() } as gameRoom;
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
