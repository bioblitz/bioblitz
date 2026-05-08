import { getContestById } from "@/lib/actions";
import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

type ContestPageParams = {
  params: {
    contestId: string;
  };
};

export async function generateMetadata({
  params,
}: ContestPageParams): Promise<Metadata> {
  const contest = await getContestById(params.contestId);
  if (!contest) {
    return { title: "Blitz Not Found | BioBlitz" };
  }
  return {
    title: `${contest.title} | BioBlitz`,
    description:
      contest.description ?? "A competitive biology blitz on BioBlitz.",
    alternates: {
      canonical: `${SITE_URL}/contests/${params.contestId}`,
    },
  };
}

export default async function ContestPage({ params }: ContestPageParams) {
  await params;
  const contest = await getContestById(params.contestId);

  if (!contest) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans pt-28 pb-12">
      <div className="container mx-auto max-w-4xl px-4">
        {contest.bannerUrl && contest.bannerUrl.trim() !== "" && (
          <div className="relative w-full h-64 mb-8 rounded-2xl overflow-hidden">
            <Image
              src={contest.bannerUrl}
              alt={`${contest.title} banner`}
              layout="fill"
              objectFit="cover"
              priority
            />
          </div>
        )}
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            {contest.title}
          </h1>
          <p className="text-neutral-400 mt-4 text-lg">{contest.description}</p>
        </header>

        <main className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-neutral-300 mb-6">
            Blitz Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-neutral-400">Topic</p>
              <p className="font-semibold">{contest.topic}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Time Limit</p>
              <p className="font-semibold">{contest.timeLimit} seconds</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Number of Questions</p>
              <p className="font-semibold">{contest.number_of_questions}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Difficulty</p>
              <p className="font-semibold">{contest.difficulty}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
