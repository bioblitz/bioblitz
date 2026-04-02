import type { Metadata } from "next";
import React from "react";
import { SITE_URL } from "@/lib/site-url";

type Props = {
  params: Promise<{ username: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username}'s Profile | BioBlitz`,
    description: `View ${username}'s biology competition stats, ratings, and contest history on BioBlitz.`,
    alternates: {
      canonical: `${SITE_URL}/profile/${username}`,
    },
  };
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
