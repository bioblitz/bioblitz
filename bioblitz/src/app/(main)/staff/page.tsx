"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function StaffPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [authorized, setAuthorized] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-zinc-100">
        <div className="max-w-5xl mx-auto px-4 py-20">Loading...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-neutral-900 text-zinc-100">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-zinc-400">You do not have permission to view this page.</p>
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
    <div className="min-h-screen bg-neutral-900 text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 py-20">
        <h1 className="text-3xl font-bold text-zinc-100">Staff Page</h1>
        <p className="text-zinc-400 mt-2">
          Staff and admins only.
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={() => router.push("/contests/create?postAs=mitosisphere")}
            className="px-4 py-2 rounded-lg bg-neutral-900 border border-yellow-300 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
          >
            Create contest as mitosisphere
          </button>
        </div>
      </div>
    </div>
  );
}
