"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  Firestore,
} from "firebase/firestore";
import { EloHistoryPoint, SetPlayed, UserProfile } from "./types";

interface UseProfileDataParams {
  db: Firestore;
  usernameParamRaw: string;
  usernameParamNormalized: string;
}

export function useProfileData({
  db,
  usernameParamRaw,
  usernameParamNormalized,
}: UseProfileDataParams) {
  const [profileUid, setProfileUid] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [setsPlayed, setSetsPlayed] = useState<SetPlayed[]>([]);
  const [eloHistory, setEloHistory] = useState<EloHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserByUsernameOrUid = async () => {
      try {
        setLoading(true);
        setError(null);
        setUserProfile(null);
        setProfileUid(null);

        if (!usernameParamRaw) {
          setError("User not found.");
          return;
        }

        const q = query(
          collection(db, "users"),
          where("username", "==", usernameParamNormalized)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data() as UserProfile;
          setProfileUid(userDoc.id);
          setUserProfile({ ...userData, uid: userDoc.id });
          return;
        }

        const uidSnap = await getDoc(doc(db, "users", usernameParamRaw));
        if (uidSnap.exists()) {
          const userData = uidSnap.data() as UserProfile;
          setProfileUid(uidSnap.id);
          setUserProfile({ ...userData, uid: uidSnap.id });
          return;
        }

        setError("User not found.");
      } catch (err) {
        console.error(err);
        setError("Unable to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserByUsernameOrUid();
  }, [db, usernameParamRaw, usernameParamNormalized]);

  useEffect(() => {
    if (!profileUid) return;

    const fetchSetsPlayed = async () => {
      try {
        const setsRef = collection(db, "users", profileUid, "setsPlayed");
        const setsSnap = await getDocs(setsRef);

        const sortedDocs = setsSnap.docs.sort((a, b) => {
          const dataA = a.data();
          const dataB = b.data();
          const timeA =
            dataA.lastPlayedAt?.toMillis() || dataA.playedAt?.toMillis() || 0;
          const timeB =
            dataB.lastPlayedAt?.toMillis() || dataB.playedAt?.toMillis() || 0;
          return timeB - timeA;
        });

        const setsData = (
          await Promise.all(
            sortedDocs.map(async (playedDoc) => {
              const playedData = playedDoc.data();

              const originalSetId =
                playedData.setId ||
                playedData.setID ||
                playedData.id ||
                playedDoc.id;
              let resolvedSetId = "";

              let topic =
                playedData.topic ||
                playedData.Topic ||
                playedData.category ||
                "General";
              let title = playedData.title || "Unknown Set";

              let foundOriginal = false;

              if (originalSetId) {
                try {
                  const originalSetRef = doc(db, "sets", originalSetId);
                  const originalSetSnap = await getDoc(originalSetRef);

                  if (originalSetSnap.exists()) {
                    const originalData = originalSetSnap.data();
                    topic =
                      originalData.topic ||
                      originalData.Topic ||
                      originalData.category ||
                      topic;
                    title = originalData.title || title;
                    foundOriginal = true;
                    resolvedSetId = originalSetId;
                  }
                } catch (e) {
                  console.error("ID lookup failed", e);
                }
              }

              if (!foundOriginal && playedData.title) {
                try {
                  const q = query(
                    collection(db, "sets"),
                    where("title", "==", playedData.title),
                    limit(1)
                  );
                  const querySnap = await getDocs(q);

                  if (!querySnap.empty) {
                    const matchedDoc = querySnap.docs[0];
                    const originalData = matchedDoc.data();
                    topic =
                      originalData.topic ||
                      originalData.Topic ||
                      originalData.category ||
                      topic;
                    title = originalData.title || title;
                    foundOriginal = true;
                    resolvedSetId = matchedDoc.id;
                  }
                } catch (e) {
                  console.error("Title lookup failed", e);
                }
              }

              if (!foundOriginal) {
                return null;
              }

              return {
                name: title,
                score: playedData.score || 0,
                topic,
                setId: resolvedSetId,
              } as SetPlayed;
            })
          )
        ).filter((set): set is SetPlayed => set !== null);

        setSetsPlayed(setsData);
      } catch (err) {
        console.error(err);
      }
    };

    fetchSetsPlayed();
  }, [db, profileUid]);

  useEffect(() => {
    if (!profileUid || !userProfile) return;

    const fetchHistory = async () => {
      try {
        const historyRef = collection(db, "users", profileUid, "ratingHistory");
        const q = query(historyRef, orderBy("timestamp", "asc"), limit(20));
        const snap = await getDocs(q);

        const historyData: EloHistoryPoint[] = snap.docs.map((docSnap) => {
          const data: any = docSnap.data();
          const date = data.timestamp
            ? new Date(data.timestamp.seconds * 1000)
            : new Date();
          return {
            elo: data.newElo,
            date: date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            }),
            fullDate: date.toLocaleDateString(),
          };
        });

        if (historyData.length === 0 && userProfile.bElo) {
          historyData.push({
            elo: userProfile.bElo,
            date: "Now",
            fullDate: new Date().toLocaleDateString(),
          });
          historyData.unshift({
            elo: 1200,
            date: "Joined",
            fullDate: "Start",
          });
        }

        setEloHistory(historyData);
      } catch (err) {
        console.error(err);
      }
    };

    fetchHistory();
  }, [db, profileUid, userProfile]);

  return {
    profileUid,
    userProfile,
    setUserProfile,
    setsPlayed,
    eloHistory,
    loading,
    error,
  };
}
