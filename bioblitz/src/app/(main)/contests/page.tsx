import { ContestFilters } from "@/components/features/contests/ContestFilters";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCompletedContests } from "@/lib/actions";
import ContestCard from "@/components/features/contests/ContestCard";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Blitzes | BioBlitz",
  description: "Browse and take biology contests on BioBlitz.",
  alternates: {
    canonical: `${SITE_URL}/contests`,
  },
};

export default async function ContestsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  const completedContests = await getCompletedContests();

  return (
    <div className="min-h-screen font-inter bg-neutral-900 text-white p-8 pl-16">
      <h1 className="text-4xl font-bold mb-8">Blitzes</h1>
      <div className="flex gap-8">
        <aside className="w-1/4 ml-4">
          <ContestFilters />
        </aside>
        <main className="w-3/4">
          {completedContests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {completedContests.map((contest) => (
                <ContestCard key={contest.id} contest={contest} />
              ))}
            </div>
          ) : (
            <p className="text-zinc-400">No completed Blitzes available.</p>
          )}
        </main>
      </div>
    </div>
  );
}
