import { ContestFilters } from "@/components/features/contests/ContestFilters";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ContestsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

    return (
    <div className="min-h-screen font-inter bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Contests</h1>
      <div className="flex gap-8">
        <aside className="w-1/4 ml-4">
          <ContestFilters />
        </aside>
        <main className="w-3/4">
          <p>List of contests will go here.</p>
        </main>
      </div>
    </div>
  );

}
