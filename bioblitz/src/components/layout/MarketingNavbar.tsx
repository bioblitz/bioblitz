"use client";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Zap, Trophy, LogIn } from "lucide-react";

export default function MarketingNavbar() {
  const { loading } = useAuth();

  return (
    <nav className="fixed w-full bg-neutral-900 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="bg-yellow-400/10 p-1.5 rounded-full group-hover:bg-yellow-400/20 transition-colors">
              <img src="/icons/favicon.ico" className="w-6 h-6" alt="BioBlitz" />
            </div>
            <span style={{ fontFamily: "'nunito', sans-serif", fontWeight: 800 }} className="text-white text-xl">
              BioBlitz
            </span>          
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-zinc-400 hover:border-none border text-white border-slate-50 transition-all duration-200"
            >
              Blitzes
            </Link>

            {!loading && (
              <Link
                href="/auth"
                className="group relative inline-flex items-center justify-center px-5 py-2 text-sm font-460 bg-slate-50 text-black transition-all duration-200 font-pj rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 outline"
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
