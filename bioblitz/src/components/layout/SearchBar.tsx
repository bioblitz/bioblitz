"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface SearchResult {
  type: string;
  title: string;
  subtitle: string;
  href: string;
}

export default function SearchBar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    setSearchLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
        );
        if (!response.ok) {
          throw new Error("Search failed");
        }
        const data = await response.json();
        const results = Array.isArray(data.results) ? data.results : [];
        
        // Map /contests/ to /home/ for immediate effect
        const mappedResults = results.map((result: SearchResult) => ({
          ...result,
          href: result.href.startsWith("/contests/") 
            ? result.href.replace("/contests/", "/home/") 
            : result.href
        }));

        setSearchResults(mappedResults);
        setSearchOpen(true);
      } catch (error) {
        setSearchResults([]);
        setSearchOpen(true);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  return (
    <div className="hidden md:block relative ml-100" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (searchResults.length > 0) setSearchOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchResults[0]) {
              router.push(searchResults[0].href);
              setSearchOpen(false);
            }
          }}
          placeholder="Search"
          className="w-80 bg-zinc-900/70 border border-zinc-800 rounded-full pl-9 pr-9 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
        />
        {searchLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            ...
          </span>
        )}
      </div>

      {searchOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
          {searchResults.length === 0 ? (
            <div className="px-4 py-3 text-sm text-zinc-500">
              No results found.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {searchResults.map((result, index) => (
                <Link
                  key={`${result.type}-${index}`}
                  href={result.href}
                  onClick={() => setSearchOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
                >
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 border border-zinc-800 rounded-full px-2 py-0.5">
                    {result.type}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-zinc-100 truncate">
                      {result.title}
                    </span>
                    {result.subtitle && (
                      <span className="text-xs text-zinc-500 truncate">
                        {result.subtitle}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
