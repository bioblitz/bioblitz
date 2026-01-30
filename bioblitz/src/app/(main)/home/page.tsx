import { allGames } from "@/lib/gameRoomsAll";
import HomeClient from "./HomeClient";

export const revalidate = 1800; 

export default async function Page() {
  const games = await allGames();

  return <HomeClient initialGames={games} />;
}