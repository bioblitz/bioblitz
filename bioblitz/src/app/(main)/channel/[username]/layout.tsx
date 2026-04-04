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
    title: `${username}'s Channel | BioBlitz`,
    description: `Watch biology contests and content created by ${username} on BioBlitz.`,
    alternates: {
      canonical: `${SITE_URL}/channel/${username}`,
    },
  };
}

export default function ChannelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
