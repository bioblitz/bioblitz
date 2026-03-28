import { MetadataRoute } from "next";
import {
  getStaticRoutes,
  getUsernames,
  getContestIds,
  SITE_URL,
} from "./sitemap.config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes = getStaticRoutes(now);

  const [usernames, contests] = await Promise.all([
    getUsernames(),
    getContestIds(),
  ]);

  const channelRoutes: MetadataRoute.Sitemap = usernames.map((username) => ({
    url: `${SITE_URL}/channel/${username}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const profileRoutes: MetadataRoute.Sitemap = usernames.map((username) => ({
    url: `${SITE_URL}/profile/${username}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const contestRoutes: MetadataRoute.Sitemap = contests.map(
    ({ id, updatedAt }) => ({
      url: `${SITE_URL}/contests/${id}`,
      lastModified: updatedAt ?? now,
      changeFrequency: "daily",
      priority: 0.8,
    })
  );

  return [...staticRoutes, ...channelRoutes, ...profileRoutes, ...contestRoutes];
}