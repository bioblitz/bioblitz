
"use server";
import { firestore, auth } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import { gameRoom, Question } from "@/types";
import { revalidatePath } from "next/cache";

export async function createContest(prevState: { message: string }, formData: FormData) {
  const user = auth.currentUser;

  if (!user) {
    return { message: "You must be logged in to create a contest." };
  }

  const questionsString = formData.get("questions") as string;
  const questions: Question[] = questionsString ? JSON.parse(questionsString) : [];

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
  };

  try {
    const docRef = await addDoc(collection(firestore, "sets"), contest);
    console.log("Document written with ID: ", docRef.id);
    revalidatePath("/contests");
    return { message: `Contest created with ID: ${docRef.id}` };
  } catch (e) {
    console.error("Error adding document: ", e);
    return { message: "Failed to create contest" };
  }
}
