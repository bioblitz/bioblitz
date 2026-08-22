export const dynamic = 'force-dynamic';

import { getPuzzles } from "@/lib/potd";
import PotdClient from "./PotdClient";

export default async function PotdPage() {
  const puzzles = await getPuzzles();
  return <PotdClient initialPuzzles={puzzles} />;
}