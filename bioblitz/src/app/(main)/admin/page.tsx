import { getCurrentUser } from "@/lib/auth";
import { getFirestore } from "firebase-admin/firestore";
import { app } from "@/lib/auth";
import Link from "next/link";

async function isAdmin(uid: string): Promise<boolean> {
  const db = getFirestore(app);
  const userDoc = await db.collection("users").doc(uid).get();
  const roles: string[] = userDoc.data()?.roles ?? [];
  return roles.includes("admin");
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  const admin = user ? await isAdmin(user.uid) : false;

  if (!admin) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center gap-6">
        <p className="text-zinc-400 text-lg">Sorry, this page is inaccessible to you.</p>
        <Link href="/home" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
          Return to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center gap-6">
      <p className="text-zinc-200 text-lg">Congrats, you are an admin!</p>
      <Link href="/home" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
        Return to home
      </Link>
    </div>
  );
}
