"use client"; // This directive is required for interactivity

import { useState, useEffect } from "react";

export default function DemoModal({ videoId }: { videoId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  // Optional: Close modal when pressing ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <>
      {/* The Button - Styled exactly like your original */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full sm:w-auto bg-[#11162A] text-slate-300 font-bold py-4 px-10 rounded-lg hover:bg-slate-800 hover:text-white transition-all duration-200"
      >
        View Demo
      </button>

      {/* The Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)} // Close when clicking background
        >
          {/* Modal Content Container */}
          <div
            className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking video
          >
            {/* Close Button (Top Right) */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 18 18" />
              </svg>
            </button>

            {/* YouTube Embed */}
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    </>
  );
}
