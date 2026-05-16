"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Flag, Loader2, CheckCircle2 } from "lucide-react";
import {
  subscribeToReports,
  type MessageReport,
  type ReportStatus,
} from "@/lib/moderation";
import ReportCard from "@/components/admin/ReportCard";

type StatusFilter = ReportStatus | "all";

export default function MessageReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [listenerReady, setListenerReady] = useState(false);

  const roles: string[] = Array.isArray(user?.roles)
    ? user.roles.map((r: unknown) => String(r).toLowerCase())
    : [];
  const isStaff = roles.includes("admin") || roles.includes("staff");

  useEffect(() => {
    if (loading) return;
    if (!user || !isStaff) {
      router.push("/home");
    }
  }, [loading, user, isStaff, router]);

  useEffect(() => {
    if (!isStaff) return;
    const unsubscribe = subscribeToReports(statusFilter, (rs) => {
      setReports(rs);
      setListenerReady(true);
    });
    return () => unsubscribe();
  }, [statusFilter, isStaff]);

  if (loading || !isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
      </div>
    );
  }

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-neutral-900">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pl-4 md:pl-20 pt-16 md:pt-24 pb-24 md:pb-12">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-orange-500/10">
              <Flag className="w-5 h-5 text-orange-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Message reports
            </h1>
          </div>
          <p className="text-neutral-500 text-sm">
            Review reported messages and take action.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-5 border-b border-neutral-800 pb-3">
          {(
            [
              { value: "pending", label: "Pending" },
              { value: "resolved", label: "Resolved" },
              { value: "all", label: "All" },
            ] as { value: StatusFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
                statusFilter === tab.value
                  ? "bg-orange-500/15 text-orange-300 border border-orange-500/30"
                  : "bg-transparent text-neutral-500 border border-transparent hover:text-neutral-300"
              }`}
            >
              {tab.label}
              {tab.value === "pending" && pendingCount > 0 && (
                <span className="text-[10px] tabular-nums bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {!listenerReady ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="w-10 h-10 text-neutral-700 mb-3" />
            <p className="text-sm font-bold text-neutral-300 mb-1">
              No {statusFilter === "all" ? "" : statusFilter} reports
            </p>
            <p className="text-xs text-neutral-500">
              {statusFilter === "pending"
                ? "You're all caught up."
                : "Nothing here yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                staffUid={user!.uid}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
