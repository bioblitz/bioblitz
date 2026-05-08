"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";

type StaffQuota = {
  target: number;
  published: number;
  remaining: number;
  progress: number;
  monthLabel: string;
  daysRemaining: number;
};

export default function StaffPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [quota, setQuota] = useState<StaffQuota | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/auth");
      return;
    }

    const roles = Array.isArray(user.roles)
      ? user.roles.map((role: unknown) => String(role).toLowerCase())
      : [];
    const isAdmin = roles.includes("admin");
    const isStaff = isAdmin || roles.includes("staff");

    setAuthorized(isStaff);
  }, [loading, router, user]);

  useEffect(() => {
    const loadQuota = async () => {
      if (!authorized || !user) return;
      try {
        setQuotaLoading(true);
        const token = await getAuth(app).currentUser?.getIdToken();
        if (!token) throw new Error("No auth token");
        const res = await fetch("/api/staff/metrics", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load staff metrics.");
        setQuota(data.quota || null);
      } catch (error) {
        console.error("Failed to load staff quota:", error);
      } finally {
        setQuotaLoading(false);
      }
    };

    loadQuota();
  }, [authorized, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100">
        <div className="max-w-5xl mx-auto px-4 py-20">Loading...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-neutral-400">
            You do not have permission to view this page.
          </p>
          <div className="mt-6">
            <Link
              href="/home"
              className="text-sm text-neutral-400 hover:text-neutral-300 transition-colors"
            >
              Return to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <div className="max-w-5xl mx-auto px-4 py-20">
        <h1 className="text-3xl font-bold text-neutral-100">Staff Page</h1>
        <p className="text-neutral-400 mt-2">Staff and admins only.</p>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-100">
                Contest Publishing Quota
              </h2>
              <p className="text-sm text-neutral-400 mt-1">
                Goal: 100 contests published by the end of April.
              </p>
            </div>
            <span className="text-xs text-neutral-500">
              {quota?.monthLabel || "April"}
            </span>
          </div>

          {quotaLoading ? (
            <p className="text-sm text-neutral-500 mt-4">Loading progress...</p>
          ) : quota ? (
            <>
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-yellow-400 transition-all"
                  style={{ width: `${Math.max(4, Math.round(quota.progress * 100))}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span className="text-neutral-200">
                  <strong>{quota.published}</strong> / {quota.target} published
                </span>
                <span className="text-neutral-400">
                  {quota.remaining} remaining
                </span>
                <span className="text-neutral-500">
                  {quota.daysRemaining} day{quota.daysRemaining === 1 ? "" : "s"} left
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-500 mt-4">Quota metrics unavailable right now.</p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.push("/contests/create?postAs=mitosisphere")}
            className="px-4 py-2 rounded-lg bg-neutral-900 border border-yellow-300 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors w-fit"
          >
            Create contest as mitosisphere
          </button>

          <button
            type="button"
            onClick={() => router.push("/reported")}
            className="px-4 py-2 rounded-lg bg-neutral-900 border border-red-400 text-red-400 text-sm font-semibold hover:bg-neutral-800 transition-colors w-fit"
          >
            View reported questions
          </button>
        </div>
      </div>
    </div>
  );
}
