{/*
"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";

export default function CurtainReveal({ trigger = false }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (trigger) {
      const start = setTimeout(() => setAnimate(true), 150); // short delay before animation starts

      return () => {
        clearTimeout(start);
      };
    } else {
      setAnimate(false);
    }
  }, [trigger]);

  return (
    <div className="fixed inset-0 z-50 flex pointer-events-none">
      <div
        className={clsx(
          "relative w-1/2 h-full bg-neutral-900 transition-transform duration-[2000ms] origin-left will-change-transform [transition-timing-function:cubic-bezier(0.65, 0, 0.35, 1)]",
          animate ? "-translate-x-full" : "translate-x-0"
        )}
      >
        <div
          className={clsx(
            " absolute top-0 right-0 h-full w-10 pointer-events-none",
            "bg-gradient-to-l from-blue-800/90 to-transparent",
            "transition-opacity duration-2000",
            animate ? "opacity-100" : "opacity-0"
          )}
        />
      </div>

      <div
        className={clsx(
          "relative w-1/2 h-full bg-neutral-900 transition-transform duration-[2000ms] origin-right will-change-transform [transition-timing-function:cubic-bezier(0.65, 0, 0.35, 1)]",
          animate ? "translate-x-full" : "translate-x-0"
        )}
      >
        <div
          className={clsx(
            " absolute top-0 left-0 h-full w-10 pointer-events-none",
            "bg-gradient-to-r from-blue-800/90 to-transparent",
            "transition-opacity duration-2000",
            animate ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
    </div>
  );
}
*/}