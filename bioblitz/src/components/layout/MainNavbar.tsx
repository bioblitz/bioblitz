"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import UserNav from "./UserNav";
import { Zap } from "lucide-react";
import { House, Gamepad2, Info } from "lucide-react";

export default function MainNavbar() {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <nav className="w-full bg-black sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <div
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="cursor-pointer"
            >
              <Zap className="w-8 h-8 text-cyan-700" />
            </div>

            <Link href="/home">
              <span className="text-white text-2xl font-bold tracking-widest uppercase cursor-pointer">
                BioBlitz
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4 relative">
            {isAuthenticated && <UserNav />}
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <>
          <div
            className="bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          ></div>

          <div
            className={`fixed top-16 left-0 h-[calc(100%-4rem)] w-19 bg-zinc-950 shadow-xl p-6 z-50 transform transition-transform duration-300 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <ul className="space-y-2">
              <li>
                <Link
                  href="/home"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2  text-white  hover:text-[#5CA3FF]/80 "
                >
                  <House size={35} />
                </Link>
              </li>
              <li>
                <Link
                  href="/contests"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 text-white hover:text-cyan-400"
                  className="flex items-center gap-2 text-white hover:text-[#5CA3FF]/80 "
                >
                  <Gamepad2 size={35} />
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 text-white hover:text-cyan-400"
                  className="flex items-center gap-2 text-white hover:text-[#5CA3FF]/80 "
                >
                  <Info size={35} />
                </Link>
              </li>
            </ul>
          </div>
        </>
      )}
    </nav>
  );
}
