import { allGames } from "@/lib/gameRoomsAll";
import HomeClient from "./HomeClient";

//Frequency of update for home page (sets will not reupdate until this many seconds, saves us a lot of money)
export const revalidate = 1800; 

export default async function Page() {
  const games = await allGames();

  return <HomeClient initialGames={games} />;
}