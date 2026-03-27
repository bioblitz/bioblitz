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
  authLoading: boolean;
}

export function useProfileData({
  db,
  usernameParamRaw,
  usernameParamNormalized,
  authLoading,
}: UseProfileDataParams) {
  const [profileUid, setProfileUid] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [setsPlayed, setSetsPlayed] = useState<SetPlayed[]>([]);
  const [eloHistory, setEloHistory] = useState<EloHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSets, setLoadingSets] = useState(true);
  const [loadingElo, setLoadingElo] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    const fetchUserByUsernameOrUid = async () => {
      if (!usernameParamRaw || usernameParamRaw === "undefined") {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const rawNoAt = usernameParamRaw.startsWith("@")
          ? usernameParamRaw.slice(1)
          : usernameParamRaw;
        const normalizedNoAt = usernameParamNormalized.startsWith("@")
          ? usernameParamNormalized.slice(1)
          : usernameParamNormalized;

        const identifierCandidates = Array.from(
          new Set(
            [
              usernameParamRaw,
              usernameParamNormalized,
              rawNoAt,
              normalizedNoAt,
            ]
              .map((v) => v.trim())
              .filter(Boolean)
          )
        );

        for (const candidate of identifierCandidates) {
          const q = query(
            collection(db, "users"),
            where("username", "==", candidate)
          );
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data() as UserProfile;
            setProfileUid(userDoc.id);
            setUserProfile({ ...userData, uid: userDoc.id });
            setLoading(false);
            return;
          }
        }

        for (const candidate of identifierCandidates) {
          const uidSnap = await getDoc(doc(db, "users", candidate));
          if (uidSnap.exists()) {
            const userData = uidSnap.data() as UserProfile;
            setProfileUid(uidSnap.id);
            setUserProfile({ ...userData, uid: uidSnap.id });
            setLoading(false);
            return;
          }
        }

        setError("User not found.");
      } catch (err) {
        console.error("Error fetching user:", err);
        setError("Unable to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserByUsernameOrUid();
  }, [db, usernameParamRaw, usernameParamNormalized, authLoading]);

  useEffect(() => {
    if (!profileUid) return;

    const fetchSetsPlayed = async () => {
      setLoadingSets(true);
      try {
        const setsRef = collection(db, "users", profileUid, "setsPlayed");
        const historyRef = collection(db, "users", profileUid, "ratingHistory");
        const [setsSnap, historySnap] = await Promise.all([
          getDocs(setsRef),
          getDocs(historyRef),
        ]);

        const deltaMap = new Map<string, { delta: number; elo: number }>();
        historySnap.docs.forEach((d) => {
          const data = d.data() as any;
          if (data.contestId) {
            deltaMap.set(data.contestId, { 
              delta: data.delta ?? 0, 
              elo: data.newElo ?? data.elo ?? 0 
            });
          }
        });

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
              let contestRatingFromSet = 0;

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
                    contestRatingFromSet = originalData.contestRating || 0;
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
                    contestRatingFromSet = originalData.contestRating || 0;
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

              let rank = playedData.rank || playedData.ranking || null;
              if (rank === null) {
                try {
                  const subId = playedData.submission || playedData.submissionId;
                  if (subId) {
                    const subSnap = await getDoc(doc(db, "gameSubmissions", subId));
                    if (subSnap.exists()) {
                      rank = subSnap.data().rank || subSnap.data().ranking || null;
                    }
                  }
                } catch (e) {}
              }

              const historyInfo = deltaMap.get(resolvedSetId);

              return {
                name: title,
                correctCount: playedData.correctCount,
                totalQuestions: playedData.totalQuestions,
                timeTaken: playedData.timeTaken,
                topic,
                setId: resolvedSetId,
                delta: historyInfo?.delta,
                contestRating: contestRatingFromSet || playedData.contestRating || 0,
                rank: rank,
              } as SetPlayed;
            })
          )
        ).filter((set): set is SetPlayed => set !== null);

        setSetsPlayed(setsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSets(false);
      }
    };

    fetchSetsPlayed();
  }, [db, profileUid]);

  useEffect(() => {
    if (!profileUid || !userProfile) return;

    const fetchHistory = async () => {
      setLoadingElo(true);
      try {
        const historyRef = collection(db, "users", profileUid, "ratingHistory");
        const q = query(historyRef, orderBy("timestamp", "desc"), limit(50));
        const snap = await getDocs(q);

        const fetchedHistory: EloHistoryPoint[] = snap.docs.reverse().map((docSnap) => {
          const data: any = docSnap.data();
          const date = data.timestamp
            ? new Date(data.timestamp.seconds * 1000)
            : new Date();
          return {
            elo: data.newElo,
            delta: data.delta || 0,
            date: date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            }),
            fullDate: date.toLocaleDateString(),
          };
        });

        const historyData: EloHistoryPoint[] = [];

        if (fetchedHistory.length > 0) {
          const firstPoint = fetchedHistory[0];
          const startElo = firstPoint.elo - (firstPoint.delta || 0);
          
          historyData.push({
            elo: startElo,
            date: "Start",
            fullDate: "Initial",
            delta: 0
          });

          historyData.push(...fetchedHistory);
        } else if (userProfile.bElo) {
          historyData.push({
            elo: 500,
            date: "Joined",
            fullDate: "Start",
            delta: 0
          });
          historyData.push({
            elo: userProfile.bElo,
            date: "Now",
            fullDate: new Date().toLocaleDateString(),
            delta: 0
          });
        }

        setEloHistory(historyData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingElo(false);
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
    loadingSets,
    loadingElo,
    error,
  };
}
