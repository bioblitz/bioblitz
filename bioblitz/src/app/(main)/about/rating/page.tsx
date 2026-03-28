"use client";

import { getRatingTier } from "@/lib/rating";



export default function RatingPage() {
  const BREAKPOINTS = [3000, 2800, 2600, 2400, 2250, 2100, 1950, 1750, 1600, 1450, 1250, 1100, 950, 750, 600, 450, 0];
  const TIERS = BREAKPOINTS.map((elo, i) => {
    const tier = getRatingTier(elo);
    return{
      minElo: elo,
      maxElo: i === 0 ? "infinity": BREAKPOINTS[i-1] -1,
      ...tier,
    }
  })

  return (
    <div className="min-h-screen bg-neutral-900">
      <main className="max-w-7xl mx-auto pr-4 sm:pr-6 lg:pr-8 pl-0 sm:pl-12 lg:pl-33.5 pt-24 pb-12">
        <div className="items-center text-lg text-neutral-300">
            <h1 className="text-neutral-200 text-3xl mb-6 ">Rating</h1>
            <p className="text-neutral-300 text-md mb-6">First and foremost, rating is the system that allows you to view your performance compared to your peers, as well
              as select blitzes that are in line with your current skill level. Everyone starts out at 500 rating, and can gain elo for competing in blitzes. Depending on
              your performance on the blitzes you take, your rating will either go up or down. For your first few blitzes, rating will change more drastically, finding 
              an accurate rating for yourself. On the leaderboard, you will be able to see the tier of your peers. Compete in blitzes, improve, get practice, and most
              importantly have fun! We provide a myriad of questions spanning the topics necessary for the USA Biology Olympiad as well as the MCAT examinations, and other
              related competitive biology competitions.
            </p>
            <h1 className="mb-3 font-semibold">Rating Tiers</h1>
            <table className=" border-neutral-800 border rounded-full border-spacing-x-4">
              <thead>
                <tr>
                  <th className="text-left border-neutral-700 border px-5">
                    Tier
                  </th>
                  <th className="text-left border-neutral-700 border px-5">
                    Elo range
                  </th>
                </tr>
                <tr>
                <th className="w-50 pb-2"/>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((tier, i) => {
                  const min =tier.minElo;
                  const max = tier.maxElo;
                  return (
                    <tr key={tier.label} className="group transition-all">
                      <td className={` ${tier.borderClass} px-3`}>
                      <span className="inline-block text-neutral-300 py-1.5 px-2 ">
                        {String(i+1).padStart(2, "0")}
                      </span>
                      <span className={`${tier.textClass} px-3` }>
                        {tier.label}
                      </span>
                      </td>
                      <td className={` ${tier.borderClass} px-3`}>
                        <span>
                        {tier.minElo}
                        {" - "}
                        {tier.maxElo}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
      </main>
    </div>
  );
}