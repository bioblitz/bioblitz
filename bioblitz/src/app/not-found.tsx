"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Dna, MoveLeft, Home, SearchX } from "lucide-react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function NotFound() {
  return (
    <div
      className={`${inter.className} min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden px-4`}
    >
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-2xl w-full text-center relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-24 h-24 bg-zinc-900/80 border border-zinc-800 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-violet-900/20"
        >
          <SearchX className="w-10 h-10 text-violet-400" />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600 tracking-tighter mb-4"
        >
          404
        </motion.h1>

        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl md:text-3xl font-bold text-white mb-4"
        >
          Page Not Found
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-zinc-400 text-lg mb-10 max-w-lg mx-auto"
        >
          It seems the page you are looking for has either evolved into
          something else or undergone apoptosis.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/home"
            className="w-full sm:w-auto px-8 py-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-violet-900/20 hover:scale-105 active:scale-95"
          >
            <Home className="w-4 h-4" />
            Return to Home
          </Link>

          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto px-8 py-3.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
          >
            <MoveLeft className="w-4 h-4" />
            Go Back
          </button>
        </motion.div>
      </div>
    </div>
  );
}
