export const dynamic = 'force-dynamic';

import { getCachedPuzzles } from "@/lib/potd";
import PotdClient from "./PotdClient";

export const revalidate = 3600;

export default async function PotdPage() {
  const puzzles = await getCachedPuzzles();

  return <PotdClient initialPuzzles={puzzles} />;
}