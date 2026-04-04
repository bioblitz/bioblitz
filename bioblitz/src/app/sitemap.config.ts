import { MetadataRoute } from "next";
import { adminFirestore } from "@/lib/firebase-admin";
import { SITE_URL } from "@/lib/site-url";

export { SITE_URL };

export function getStaticRoutes(now: Date): MetadataRoute.Sitemap {
  const staticPaths: {
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }[] = [
    { path: "/", changeFrequency: "daily", priority: 1.0 },
    { path: "/contests", changeFrequency: "daily", priority: 0.9 },
    { path: "/about", changeFrequency: "monthly", priority: 0.5 },
    { path: "/privacy-policy", changeFrequency: "monthly", priority: 0.3 },
    {
      path: "/terms-and-conditions",
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  return staticPaths.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}

export async function getUsernames(): Promise<string[]> {
  const snapshot = await adminFirestore.collection("users").get();

  return snapshot.docs
    .map((doc) => (doc.data() as { username?: string }).username ?? "")
    .filter(Boolean);
}

export async function getContestIds(): Promise<
  { id: string; updatedAt?: Date }[]
> {
  const snapshot = await adminFirestore
    .collection("sets")
    .where("hidden", "!=", "true")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data() as { updatedAt?: { toDate: () => Date } };
    return {
      id: doc.id,
      updatedAt: data.updatedAt?.toDate(),
    };
  });
}
