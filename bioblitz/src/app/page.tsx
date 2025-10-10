import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageReloader from "@/components/PageReloader";

export default async function mainPage({ searchParams }: { searchParams: {potato:string} }) {
  const user = await getCurrentUser();
  <PageReloader />
  if (user) {
    redirect("/home");
  }
  return (
    <div className="min-h-screen flex flex-col items-center font-inter bg-black">
      <section className="w-full text-center py-40">
        <div className=" py-5">
          <h1 className="text-6xl font-bold text-white text-transparent mb-2">
            Learning Biology
          </h1>
          <p className="text-5xl text-white mb-6 opacity-90 bold drop-shadow">
            should be fun
          </p>
          
          <Link href="/home">
            <button className="bg-neutral-500 text-white font-bold py-3 px-8 rounded hover:bg-blue-600">
              Get Started
            </button>
          </Link>
        </div>
        <div className="flex justify-center space-x-8 py-4">
          <div className="flex items-center text-gray-400 text-medium">
            <svg className="w-8 h-8 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            USABO
          </div>
          <div className="flex items-center text-gray-400 text-medium">
            <svg className="w-8 h-8 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            MCAT
          </div>
        </div>
      </section>
      {/*
      <section className="w-full flex flex-col items-center bg-white text-black py-20 px-8">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-black drop-shadow">
          How BioBlitz Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          <div className="bg-gray-100 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <h3 className="text-xl font-semibold mb-2">20+ Problem Writers</h3>
            <p className="text-sm opacity-80">
              We have a team of over 20 expert writers backed by <Link href="https://mitosisphere.org" className="underline">Mitosisphere</Link>.
            </p>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <h3 className="text-xl font-semibold mb-2">Contests</h3>
            <p className="text-sm opacity-80">
              Solve problems in a competitive environment.
            </p>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <h3 className="text-xl font-semibold mb-2">Community</h3>
            <p className="text-sm opacity-80">
              Join our community of biology enthusiasts and create problems for others to solve.
            </p>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <h3 className="text-xl font-semibold mb-2">Compete</h3>
            <p className="text-sm opacity-80">
              Gain rating and compete with others in our contests.
            </p>
          </div>
        </div>
      </section>


      */}
    </div>
  );
}