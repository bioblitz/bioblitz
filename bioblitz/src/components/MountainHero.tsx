"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function MountainHero() {
  const starsRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = starsRef.current;
    if (!canvas) return;
    const canvasEl = canvas;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    const ctx2d = ctx;
    let W = 0;
    let H = 0;
    let stars: {
      x: number;
      y: number;
      r: number;
      a: number;
      speed: number;
      phase: number;
    }[] = [];
    let animId = 0;

    function resize() {
      W = canvasEl.width = canvasEl.offsetWidth;
      H = canvasEl.height = canvasEl.offsetHeight;
    }

    function initStars() {
      stars = [];
      for (let i = 0; i < 60; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H * 0.65,
          r: Math.random() * 1.2 + 0.2,
          a: Math.random(),
          speed: 0.003 + Math.random() * 0.006,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    function drawStars(t: number) {
      ctx2d.clearRect(0, 0, W, H);
      for (const s of stars) {
        const alpha = s.a * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        ctx2d.beginPath();
        ctx2d.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx2d.fillStyle = `rgba(245,252,255,${alpha * 0.35})`;
        ctx2d.fill();
      }
    }

    let start: number | null = null;
    function loop(ts: number) {
      if (!start) start = ts;
      drawStars(ts - start);
      animId = requestAnimationFrame(loop);
    }

    resize();
    initStars();
    animId = requestAnimationFrame(loop);
    const handleResize = () => {
      resize();
      initStars();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white">
      <canvas
        ref={starsRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40"
      />
      <div
        className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
        style={{
          backgroundImage: "url(/images/header.png)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
          backgroundSize: "cover",
        }}
      />
      <div className="relative z-10 text-center max-w-3xl mx-auto px-6 pb-24 pt-0 -mt-[100px] flex flex-col items-center">
        <h1
          className="text-white mb-0 tracking-tight leading-[0.95]"
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: "clamp(52px, 8vw, 96px)",
            fontWeight: 400,
          }}
        >
          <span
            className="block hero-reveal"
            style={{ animationDelay: "0.05s" }}
          >
            Biology is now
          </span>
          <span
            className="block hero-reveal"
            style={{ animationDelay: "0.2s" }}
          >
            <em style={{ color: "#f1f7ff", fontStyle: "italic" }}>
              beyond the books.
            </em>
          </span>
        </h1>

        <div
          className="flex items-center gap-4 my-3 w-full max-w-xs mx-auto hero-reveal"
          style={{ animationDelay: "0.35s" }}
        >
          <div
            className="flex-1 h-px"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(255,255,255,0.8), transparent)",
            }}
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="#ffffff"
            opacity="0.6"
          >
            <path d="M11 2L4 11h7l-2 7 9-10h-7l2-6z" />
          </svg>
          <div
            className="flex-1 h-px"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(255,255,255,0.8), transparent)",
            }}
          />
        </div>

        <p
          className="text-white/85 max-w-xl mb-6 leading-relaxed hero-reveal"
          style={{
            fontSize: "clamp(15px, 2vw, 18px)",
            fontWeight: 300,
            animationDelay: "0.5s",
          }}
        >
          The competitive practice platform for{" "}
          <span className="text-slate-200 font-medium">USABO</span>. Work
          through biology problems, create your own, track your Elo, and see
          where you stand in the biology world.
        </p>

        <div
          className="flex flex-col sm:flex-row gap-3 items-center justify-center hero-reveal"
          style={{ animationDelay: "0.65s" }}
        >
          <Link
            href="/auth"
            className="purple-gradient-button hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] rounded-[10px] inline-flex items-center gap-[6px] w-fit text-white font-medium text-[16px] tracking-[-0.13px] p-[10px_20px] relative overflow-hidden group"
          >
            <span className="pointer-events-none absolute inset-0 z-30 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-200" aria-hidden="true" />

            <span className="pointer-events-none absolute top-0 left-0 z-20 h-full w-full blur-[1px]" aria-hidden="true">
              <span className="blurred-border absolute -top-px -left-px z-20 h-full w-full" />
            </span>
            <span className="pointer-events-none button-shimmer absolute -top-4 -left-12 h-[153px] w-[54px] opacity-40" aria-hidden="true" />
            <span className="pointer-events-none button-shine absolute inset-y-0 -left-1/3 w-1/3" aria-hidden="true" />

            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="relative z-10"
            >
          <path d="M11 2L4 11h7l-2 7 9-10h-7l2-6z" />
          </svg>
          <span className="relative z-10">Start Competing</span>
          </Link>
        </div>
      </div>


      <a
        href="#demo"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        style={{
          color: "rgba(245,240,232,0.2)",
          fontSize: "10px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          textDecoration: "none",
          animation: "float-cue 3s ease-in-out infinite",
        }}
      >
        <span>Scroll</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </a>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
        .blurred-border {
          border-radius: inherit;
          border: 1px solid rgba(139, 92, 246, 0.7);
          box-shadow: 0 0 18px rgba(139, 92, 246, 0.45);
          filter: blur(6px);
        }
        .hero-reveal {
          opacity: 0;
          transform: translateY(12px);
          animation: hero-reveal 0.8s ease forwards;
        }
        .button-shine {
          background: linear-gradient(
            105deg,
            transparent 0%,
            rgba(255, 255, 255, 0.55) 50%,
            transparent 100%
          );
          animation: shimmer-sweep 10s ease-in-out infinite;
          opacity: 0.7;
          pointer-events: none;
        }
        .purple-gradient-button {
          background: linear-gradient(135deg, rgba(109, 40, 217, 0.95) 0%, rgba(139, 92, 246, 0.9) 100%);
          border: 1px solid rgba(167, 139, 250, 0.6);
          box-shadow: 0 10px 26px rgba(76, 29, 149, 0.35);
        }
        .button-shimmer {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.35) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: shimmer-sweep s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes hero-reveal {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shine-sweep {
          0%, 70% { transform: translateX(-120%); opacity: 0; }
          75% { opacity: 0.6; }
          100% { transform: translateX(320%); opacity: 0; }
        }
        @keyframes shimmer-sweep {
          0% { left: -30%; opacity: 0; }
          4% { opacity: 0.5; }
          10% { left: 120%; opacity: 0; }
          100% { left: 120%; opacity: 0; }
        }
        @keyframes float-cue {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(7px); }
        }
      `}</style>
    </section>
  );
}