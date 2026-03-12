"use client";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Zap, Trophy, LogIn } from "lucide-react";

export default function MarketingNavbar() {
  const { loading } = useAuth();

  return (
    <nav className="fixed w-full bg-black z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="bg-yellow-400/10 p-1.5 rounded-full group-hover:bg-yellow-400/20 transition-colors">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="text-white text-xl font-bold tracking-widest uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              BioBlitz
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all duration-200"
            >
              <Trophy className="w-4 h-4" />
              Blitzes
            </Link>

            {!loading && (
              <Link
                href="/auth"
                className="group relative inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-white transition-all duration-200 bg-violet-600 font-pj rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-600 hover:bg-violet-500"
              >
                <span className="relative flex items-center gap-2">
                  Sign In
                  <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
