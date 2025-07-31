import MarketingNavbar from "@/components/layout/MarketingNavbar";

export default function mainPage() {
  return (

     <div className="min-h-screen flex flex-col items-center font-inter bg-black">
      <section className="w-full text-center py-20 bg-gradient-to-br from-black via-blue-950 to-black mb-12">
        <div className="mx-auto px-4">
          <h1 className="text-6xl md:text-7xl font-extrabold drop-shadow-lg rounded-lg p-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Learning Biology
          </h1>
          <p className="text-2xl md:text-6xl text-white mb-6 opacity-90 bold drop-shadow">
            should be fun
          </p>
          <button className="bg-white text-blue-600 font-bold py-3 px-8 rounded-full shadow-lg hover:bg-blue-100 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300">
            <a href = "/home">Get Started</a>
          </button>
        </div>
        <div className="mx-auto flex justify-center space-x-8 py-4">
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

      <section className="w-full flex flex-col items-center bg-white text-black py-20 px-8">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-black drop-shadow">
          How BioBlitz Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
          <div className="bg-gray-100 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <h3 className="text-xl font-semibold mb-2">20+ Problem Writers</h3>
            <p className="text-sm opacity-80">
              We have a team of over 20 expert writers backed by <a href = "https://mitosisphere.org" className="underline">Mitosisphere</a>.
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


      
    </div>
  );
}