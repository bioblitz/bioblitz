import { getCachedPuzzles } from "@/lib/potd";
import PotdClient from "./PotdClient";

// Revalidate the cache every hour (matches the lib configuration)
export const revalidate = 3600;

export default async function PotdPage() {
  // Fetch from the shared server cache
  const puzzles = await getCachedPuzzles();

  return <PotdClient initialPuzzles={puzzles} />;
}