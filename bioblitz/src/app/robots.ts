import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/settings/", "/auth/"],
      },
    ],
    sitemap: "https://www.bioblitz.net/sitemap.xml",
  };
}
