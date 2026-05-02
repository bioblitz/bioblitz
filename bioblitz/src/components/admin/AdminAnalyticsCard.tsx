"use client";
import React from "react";
import Link from "next/link";

export default function AdminAnalyticsCard() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6 text-zinc-300">
      <h2 className="text-lg font-semibold text-zinc-100">Analytics moved out of the admin landing page</h2>
      <p className="mt-2 text-sm text-zinc-400">Open the Analytics page for retention, consent, funnel, and event charts.</p>
      <Link href="/admin/analytics" className="inline-flex mt-4 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-neutral-900">
        Open analytics dashboard
      </Link>
    </div>
  );
}
