"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import UserNav from "./UserNav";
import { Zap, House, Gamepad2, Info, Menu, X } from "lucide-react";

export default function MainNavbar() {
  const { isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/home", icon: House },
    { name: "Contests", href: "/contests", icon: Gamepad2 },
    { name: "About", href: "/about", icon: Info },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
        scrolled || isMobileMenuOpen
          ? "bg-black/80 backdrop-blur-md border-white/10"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* LEFT SIDE: Logo */}
          <Link href="/home" className="flex items-center space-x-2 group">
            <div className="bg-yellow-400/10 p-1.5 rounded-full group-hover:bg-yellow-400/20 transition-colors">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="text-white text-xl font-bold tracking-widest uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              BioBlitz
            </span>
          </Link>

          {/* CENTER: Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-yellow-400"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <item.icon size={18} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* RIGHT SIDE: User Nav & Mobile Toggle */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && <UserNav />}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white focus:outline-none"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU */}
      <div
        className={`md:hidden absolute w-full bg-zinc-950 border-b border-white/10 shadow-2xl transition-all duration-300 ease-in-out overflow-hidden ${
          isMobileMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pt-2 pb-6 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-yellow-400/10 text-yellow-400"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}