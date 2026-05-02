"use client";
import React from "react";

type Props = {
  totalUsers: number;
  totalContestsPlayed: number;
};

export default function AdminOverview({ totalUsers, totalContestsPlayed }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Users</p>
        <p className="mt-3 text-4xl font-semibold text-zinc-50">{totalUsers}</p>
        <p className="mt-2 text-sm text-zinc-400">Total registered accounts.</p>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Contests played</p>
        <p className="mt-3 text-4xl font-semibold text-zinc-50">{totalContestsPlayed}</p>
        <p className="mt-2 text-sm text-zinc-400">All contest participations across the user base.</p>
      </div>
      <div className="sm:col-span-2 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-sm text-zinc-400">
        Analytics, POTD, and operational metrics live in the Analytics tab.
      </div>
    </div>
  );
}
