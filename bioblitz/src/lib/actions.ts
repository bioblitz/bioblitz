"use server";
import { firestore, auth } from "./firebase";
import admin, { adminAuth, adminFirestore } from "./firebase-admin";
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

export async function createContest(
  prevState: { message: string },
  formData: FormData,
) {
  const idToken = (formData.get("idToken") as string) || null;
  const postAsUsernameRaw = String(formData.get("postAsUsername") || "").trim();

  if (!idToken) {
    return { message: "You must be logged in to create a Blitz." };
  }

  let uid: string;
  let creatorPfp = "/images/logo.svg";
  let creatorUsername = "";
  const normalizeRoles = (raw: unknown): string[] => {
    if (!Array.isArray(raw)) return [];
    return raw.map((role) => String(role).toLowerCase().trim()).filter(Boolean);
  };
  const isStaffOrAdminFromClaims = (claims: any): boolean => {
    const roles = normalizeRoles(claims?.roles);
    return (
      claims?.admin === true ||
      claims?.role === "admin" ||
      roles.includes("admin") ||
      roles.includes("staff")
    );
  };
  const loadCreatorProfile = async (userId: string) => {
    try {
      const userRecord = await adminAuth.getUser(userId);
      if (userRecord.photoURL) creatorPfp = userRecord.photoURL;
      if (userRecord.displayName) creatorUsername = userRecord.displayName;
    } catch (e) {
      // ignore
    }

    try {
      const userDoc = await adminFirestore
        .collection("users")
        .doc(userId)
        .get();
      if (userDoc.exists) {
        const data = userDoc.data() as any;
        if (data.photoURL) creatorPfp = data.photoURL;
        if (data.username) creatorUsername = data.username;
      }
    } catch (e) {
      // ignore
    }
  };
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
    await loadCreatorProfile(uid);

    if (postAsUsernameRaw) {
      let allowed = isStaffOrAdminFromClaims(decoded);
      if (!allowed) {
        const actorDoc = await adminFirestore
          .collection("users")
          .doc(uid)
          .get();
        const actorRoles = normalizeRoles(actorDoc.data()?.roles);
        allowed = actorRoles.includes("admin") || actorRoles.includes("staff");
      }
      if (!allowed) {
        return {
          message: "You do not have permission to post as another user.",
        };
      }

      const normalizedUsername = postAsUsernameRaw.toLowerCase();
      let targetUid = "";

      const userDoc = await adminFirestore
        .collection("users")
        .where("username", "==", normalizedUsername)
        .limit(1)
        .get();

      if (!userDoc.empty) {
        targetUid = userDoc.docs[0].id;
      } else {
        const byId = await adminFirestore
          .collection("users")
          .doc(normalizedUsername)
          .get();
        if (byId.exists) {
          targetUid = byId.id;
        }
      }

      if (!targetUid) {
        return { message: "Target user not found." };
      }

      uid = targetUid;
      creatorPfp = "/images/logo.svg";
      creatorUsername = "";
      await loadCreatorProfile(uid);
    }
  } catch (e) {
    console.error("Invalid ID token:", e);
    return { message: "You must be logged in to create a Blitz." };
  }

  const contestId = formData.get("contestId") as string | null;
  const questionsString = formData.get("questions") as string;
  const questions: any[] = questionsString ? JSON.parse(questionsString) : [];
  const status = (formData.get("status") as string) || "incomplete";

  const hiddenParam = formData.get("hidden");
  const hidden =
    status === "completed" ? (hiddenParam === "true" ? true : false) : true;

  let finalCreatorUid = uid;
  let finalCreatorPfp = creatorPfp;
  let finalCreatorUsername = creatorUsername;

  if (contestId && !postAsUsernameRaw) {
    try {
      const existingDoc = await adminFirestore
        .collection("sets")
        .doc(contestId)
        .get();
      if (existingDoc.exists) {
        const existing = existingDoc.data() as any;
        if (existing.creator) {
          finalCreatorUid = existing.creator;
          finalCreatorPfp = existing.creatorPfp ?? creatorPfp;
          finalCreatorUsername = existing.creatorUsername ?? creatorUsername;
        }
      }
    } catch (e) {
      // non-fatal: fall back to current user's info
    }
  }

  const contest: Omit<gameRoom, "id"> = {
    title: formData.get("title") as string,
    source: formData.get("source") as string,
    number_of_questions: questions.length.toString(),
    topic: formData.get("topic") as string,
    difficulty: formData.get("difficulty") as string,
    timeLimit: formData.get("timeLimit") as string,
    description: formData.get("description") as string,
    creator: finalCreatorUid,
    creatorPfp: finalCreatorPfp,
    creatorUsername: finalCreatorUsername,
    rating: Number(formData.get("rating")) || 0,
    status: status,
    hidden,
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
    } else {
      const ref = await adminFirestore.collection("sets").add(contest);
      savedId = ref.id;
    }

    // Write questions to subcollection, replacing any existing ones
    if (savedId && questions.length > 0) {
      const questionsColRef = adminFirestore
        .collection("sets")
        .doc(savedId)
        .collection("questions");
      const existing = await questionsColRef.get();
      await Promise.all(existing.docs.map((d) => d.ref.delete()));
      await Promise.all(
        questions.map((q) => {
          const { id, ...qData } = q;
          return questionsColRef.doc(id || questionsColRef.doc().id).set(qData);
        }),
      );
    }

    if (status === "completed") {
      await adminFirestore
        .collection("users")
        .doc(finalCreatorUid)
        .set(
          { publicSetCount: admin.firestore.FieldValue.increment(1) },
          { merge: true },
        );
    }

    revalidatePath("/contests");
    // "Blitz saved with ID:" prefix is checked by the editor to set isPublished=true.
    // Draft saves use a different prefix so the editor doesn't treat them as published.
    const messagePrefix =
      status === "completed"
        ? "Blitz saved with ID:"
        : "Blitz draft saved with ID:";
    return { message: `${messagePrefix} ${savedId}` };
  } catch (e) {
    console.error("Error saving document: ", e);
    return { message: "Failed to save Blitz" };
  }
}
export async function getContestsByCreator(
  creatorUid: string,
  creatorUsername?: string | null,
): Promise<gameRoom[]> {
  try {
    const docsById = new Map<string, any>();

    const byCreatorSnapshot = await adminFirestore
      .collection("sets")
      .where("creator", "==", creatorUid)
      .get();
    byCreatorSnapshot.forEach((docSnap) => {
      docsById.set(docSnap.id, docSnap.data());
    });

    if (creatorUsername) {
      const byUsernameSnapshot = await adminFirestore
        .collection("sets")
        .where("creatorUsername", "==", creatorUsername)
        .get();
      byUsernameSnapshot.forEach((docSnap) => {
        docsById.set(docSnap.id, docSnap.data());
      });
    }

    let creatorBanner: string | undefined;
    let creatorPfp: string | undefined;
    try {
      const creatorProfile = await getUserProfile(creatorUid);
      creatorBanner = creatorProfile?.bannerURL;
      creatorPfp = creatorProfile?.photoURL;
    } catch (e) {
      console.error("Error fetching creator banner:", e);
    }

    const contests: gameRoom[] = [];
    docsById.forEach((data, id) => {
      const questionCount =
        data.questions && Array.isArray(data.questions)
          ? data.questions.length.toString()
          : data.number_of_questions || data.questionCount?.toString() || "0";
      contests.push({
        id,
        ...data,
        number_of_questions: questionCount,
        creatorBanner: data.creatorBanner || creatorBanner,
        creatorPfp: data.creatorPfp || creatorPfp,
        creation: data.creation?.toDate?.()?.getTime() || null,
        lastRatingUpdate: data.lastRatingUpdate?.toDate?.()?.getTime() || null,
        lastPlayedAt: data.lastPlayedAt?.toDate?.()?.getTime() || null,
        activatedAt: data.activatedAt?.toDate?.()?.getTime() || null,
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
