"use client";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function MarketingNavbar() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <nav className="fixed w-full bg-black z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/home" className="flex items-center space-x-2 group">
            <div className="bg-yellow-400/10 p-1.5 rounded-full group-hover:bg-yellow-400/20 transition-colors">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="text-white text-xl font-bold tracking-widest uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              BioBlitz
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            <Link
              href="/contests"
              className="group flex items-center gap-2 px-5 py-2 rounded-full bg-yellow-500/40 border text-sm font-medium text-white border-yellow-500/50  hover:bg-yellow-500/80 transition-all duration-300"
            >
              Contests
            </Link>

            {!loading && (
              <>
                {!loading && (
                  <>
                    {!isAuthenticated ? (
                      <Link
                        href="/auth"
                        className="px-5 py-2 rounded-full bg-violet-600/40 hover:bg-violet-500/80 text-white text-sm font-semibold transition-all duration-300 shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)] border border-violet-500/50"
                      >
                        Sign In
                      </Link>
                    ) : (
                      <Link
                        href="/home"
                        className="px-5 py-2 rounded-full bg-white hover:bg-zinc-200 text-black text-sm font-bold transition-all duration-300 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4 fill-black" />
                        Play
                      </Link>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
