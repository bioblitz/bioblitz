import { unstable_cache } from "next/cache";
import admin, { adminFirestore } from "@/lib/firebase-admin";

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000);
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export type AdminStats = {
  submissionsCount: number;
  totalUsers: number;
  totalContestsPlayed: number;
  potdAttempts: number;
  potdCorrect: number;
  potdPublished: number;
  analytics: {
    dau: number;
    wau: number;
    mau: number;
    stickiness: number;
    week1Retention: number;
    month1Retention: number;
  };
};

async function fetchAdminStatsUncached(): Promise<AdminStats> {
  let submissionsCount = 0;
  let totalUsers = 0;
  let totalContestsPlayed = 0;
  let dau = 0;
  let wau = 0;
  let mau = 0;
  let week1Retention = 0;
  let month1Retention = 0;
  let potdAttempts = 0;
  let potdCorrect = 0;
  let potdPublished = 0;

  try {
    const submissionsSnap = await adminFirestore.collection("gameSubmissions").get();
    submissionsCount = submissionsSnap.size;
  } catch (err) {
    submissionsCount = 0;
  }

  try {
    const usersCountSnap = await adminFirestore.collection("users").get();
    totalUsers = usersCountSnap.size;
  } catch (err) {
    totalUsers = 0;
  }

  try {
    const contestsSnap = await adminFirestore.collection("users").select("contestsPlayed").get();
    contestsSnap.docs.forEach((docSnap) => {
      const data = docSnap.data() as { contestsPlayed?: unknown };
      totalContestsPlayed += Number(data.contestsPlayed || 0) || 0;
    });
  } catch {
    totalContestsPlayed = 0;
  }

  try {
    const usersSnap = await adminFirestore.collection("users").select("createdAt", "lastActive").get();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const active1dCutoff = now - dayMs;
    const active7dCutoff = now - 7 * dayMs;
    const active30dCutoff = now - 30 * dayMs;

    let eligibleWeek1 = 0;
    let retainedWeek1 = 0;
    let eligibleMonth1 = 0;
    let retainedMonth1 = 0;

    usersSnap.docs.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const createdAt = toDate(data.createdAt);
      const lastActive = toDate(data.lastActive) || toDate(data.lastLogin);

      if (!lastActive) return;
      const lastActiveMs = lastActive.getTime();
      if (lastActiveMs >= active1dCutoff) dau += 1;
      if (lastActiveMs >= active7dCutoff) wau += 1;
      if (lastActiveMs >= active30dCutoff) mau += 1;

      if (!createdAt) return;
      const createdMs = createdAt.getTime();
      const ageDays = (now - createdMs) / dayMs;

      if (ageDays >= 7) {
        eligibleWeek1 += 1;
        if (lastActiveMs >= createdMs + 7 * dayMs) retainedWeek1 += 1;
      }

      if (ageDays >= 30) {
        eligibleMonth1 += 1;
        if (lastActiveMs >= createdMs + 30 * dayMs) retainedMonth1 += 1;
      }
    });

    week1Retention = eligibleWeek1 > 0 ? retainedWeek1 / eligibleWeek1 : 0;
    month1Retention = eligibleMonth1 > 0 ? retainedMonth1 / eligibleMonth1 : 0;
  } catch {
    dau = 0;
    wau = 0;
    mau = 0;
    week1Retention = 0;
    month1Retention = 0;
  }

  try {
    const statsDoc = await adminFirestore.collection("stats").doc("global").get();
    if (statsDoc.exists) {
      potdAttempts = statsDoc.data()?.potdAttempts || 0;
      potdCorrect = statsDoc.data()?.potdCorrect || 0;
    }
  } catch {}

  try {
    const potdSnap = await adminFirestore.collection("potd").get();
    potdPublished = potdSnap.size;
  } catch {}

  return {
    submissionsCount,
    totalUsers,
    totalContestsPlayed,
    potdAttempts,
    potdCorrect,
    potdPublished,
    analytics: {
      dau,
      wau,
      mau,
      stickiness: mau > 0 ? dau / mau : 0,
      week1Retention,
      month1Retention,
    },
  };
}

/**
 * Cached admin stats fetcher.
 * Caches results for 1 hour (3600s).
 * Call with 'cache: "no-store"' in headers to bypass cache.
 */
export const getAdminStats = unstable_cache(
  async () => fetchAdminStatsUncached(),
  ["admin-stats"],
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ["admin-stats"],
  }
);
