import type { Metadata } from "next";
import React from "react";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "About BioBlitz – Biology Quiz Game for USABO & AP Bio",
  description:
    "BioBlitz is a free competitive biology quiz game built for USABO, AP Biology, and MCAT students. Earn an Elo rating, solve daily problems, and compete on a global leaderboard.",
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
