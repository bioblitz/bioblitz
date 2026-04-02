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
    sitemap: "https://bioblitz.net/sitemap.xml",
  };
}
