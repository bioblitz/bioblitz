import type { Metadata } from "next";
import React from "react";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "About | BioBlitz",
  description:
    "Learn about BioBlitz, the competitive biology platform for training, tracking, and improving performance in biology competitions.",
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
