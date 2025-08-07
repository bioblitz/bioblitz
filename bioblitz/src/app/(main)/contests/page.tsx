import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ContestsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <div className="min-h-screen flex flex-col items-center font-inter bg-black text-white">
      <h1 className="text-4xl font-bold mt-8">Contests</h1>
      <p className="mt-4">Welcome to the contests page!</p>
    </div>
  );
}
