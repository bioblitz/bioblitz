"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useParallax(speed = 0.3) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      el.style.transform = `translateY(${center * speed}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed]);
  return ref;
}

function CountUp({ end, suffix = "", duration = 1800 }) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useScrollReveal(0.3);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [visible, end, duration]);
  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

function FadeUp({ children, delay = 0 }) {
  const [ref, visible] = useScrollReveal(0.12);
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(48px)",
        transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

const TEAM = [
  {
    name: "Aarnav Suwal",
    role: "Co-Founder",
    color: "#a78bfa",
    glow: "#7c3aed",
    bg: "radial-gradient(135deg, #1a1035 0%, #07060f 100%)",
    initial: "AS",
    bio: "Passionate about many fields, Aarnav likes to create interdisciplinary projects like BioBlitz. He enjoys learning about neuroscience, programming, and is fluent in four languages.",
    tags: ["Neuroscience", "Full-Stack", "4 Languages"],
  },
  {
    name: "Eli Feldman",
    role: "Co-Founder",
    color: "#818cf8",
    glow: "#4338ca",
    bg: "radial-gradient(135deg, #0f1135 0%, #07060f 100%)",
    initial: "EF",
    bio: "mr. tra's favorite knucklehead",
    tags: ["Product", "Design", "Builder"],
  },
  {
    name: "Dipisha Subedi",
    role: "Co-Founder",
    color: "#c084fc",
    glow: "#7e22ce",
    bg: "radial-gradient(135deg, #1a0a35 0%, #07060f 100%)",
    initial: "DS",
    bio: "Dipisha is passionate about using AI and computer science to make an impact in healthcare. She hopes BioBlitz will help other students who love biology as much as she does.",
    tags: ["AI/ML", "Healthcare Tech", "Research"],
  },
];

function TeamCarousel() {
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(0);
  const [ref, visible] = useScrollReveal(0.1);

  const go = useCallback((dir) => {
    setActive((p) => (p + dir + TEAM.length) % TEAM.length);
  }, []);

  const gradText = {
    background:
      "linear-gradient(135deg, #a78bfa 0%, #818cf8 55%, #c084fc 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  };

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(60px)",
        transition: "opacity 0.8s ease, transform 0.8s ease",
      }}
    >
      <div
        style={{ userSelect: "none", cursor: dragging ? "grabbing" : "grab" }}
        onMouseDown={(e) => {
          setDragging(true);
          dragStart.current = e.clientX;
        }}
        onMouseUp={(e) => {
          if (!dragging) return;
          setDragging(false);
          const d = dragStart.current - e.clientX;
          if (Math.abs(d) > 50) go(d > 0 ? 1 : -1);
        }}
        onMouseLeave={() => setDragging(false)}
        onTouchStart={(e) => {
          dragStart.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const d = dragStart.current - e.changedTouches[0].clientX;
          if (Math.abs(d) > 40) go(d > 0 ? 1 : -1);
        }}
      >
        <div style={{ position: "relative", height: "420px" }}>
          {TEAM.map((member, i) => {
            const offset = (i - active + TEAM.length) % TEAM.length;
            const norm =
              offset > TEAM.length / 2 ? offset - TEAM.length : offset;
            const xPos = norm * 340;
            const scale = norm === 0 ? 1 : 0.82;
            const opacity = Math.abs(norm) > 1 ? 0 : norm === 0 ? 1 : 0.45;

            return (
              <div
                key={member.name}
                onClick={() => norm !== 0 && go(norm > 0 ? 1 : -1)}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: "320px",
                  transform: `translate(calc(-50% + ${xPos}px), -50%) scale(${scale})`,
                  opacity,
                  zIndex: norm === 0 ? 10 : 5,
                  transition: "all 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
                  cursor: norm !== 0 ? "pointer" : "grab",
                }}
              >
                <div
                  style={{
                    background: member.bg,
                    border: `1px solid ${norm === 0 ? member.color + "45" : "#ffffff0d"}`,
                    borderRadius: "20px",
                    padding: "32px",
                    height: "360px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                    boxShadow:
                      norm === 0
                        ? `0 0 80px ${member.glow}20, inset 0 1px 0 ${member.color}12`
                        : "none",
                    transition: "all 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        background: `${member.color}15`,
                        border: `2px solid ${member.color}50`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "18px",
                        fontWeight: "700",
                        color: member.color,
                        flexShrink: 0,
                      }}
                    >
                      {member.initial}
                    </div>
                    <div>
                      <div
                        style={{
                          color: "#e8e6f0",
                          fontWeight: "600",
                          fontSize: "18px",
                          fontFamily: "'Playfair Display', serif",
                          lineHeight: 1.2,
                        }}
                      >
                        {member.name}
                      </div>
                      <div
                        style={{
                          color: member.color,
                          fontSize: "11px",
                          fontWeight: "500",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          marginTop: "5px",
                          opacity: 0.8,
                        }}
                      >
                        {member.role}
                      </div>
                    </div>
                  </div>

                  <p
                    style={{
                      color: "#6a6880",
                      fontSize: "14px",
                      lineHeight: "1.75",
                      flex: 1,
                    }}
                  >
                    {member.bio}
                  </p>

                  <div
                    style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                  >
                    {member.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          background: `${member.color}0e`,
                          border: `1px solid ${member.color}28`,
                          color: member.color,
                          fontSize: "11px",
                          fontWeight: "600",
                          padding: "4px 10px",
                          borderRadius: "100px",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          marginTop: "40px",
        }}
      >
        <button
          onClick={() => go(-1)}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "1px solid #2a2848",
            background: "transparent",
            color: "#e8e6f0",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            transition: "border-color 0.2s, background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#a78bfa55";
            e.currentTarget.style.background = "#a78bfa0d";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#2a2848";
            e.currentTarget.style.background = "transparent";
          }}
        >
          ←
        </button>

        <div style={{ display: "flex", gap: "8px" }}>
          {TEAM.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                width: i === active ? "24px" : "8px",
                height: "8px",
                borderRadius: "100px",
                background: i === active ? TEAM[active].color : "#2a2848",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.35s cubic-bezier(0.23, 1, 0.32, 1)",
              }}
            />
          ))}
        </div>

        <button
          onClick={() => go(1)}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "1px solid #2a2848",
            background: "transparent",
            color: "#e8e6f0",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            transition: "border-color 0.2s, background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#a78bfa55";
            e.currentTarget.style.background = "#a78bfa0d";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#2a2848";
            e.currentTarget.style.background = "transparent";
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const blob1 = useParallax(0.15);
  const blob2 = useParallax(-0.1);
  const blob3 = useParallax(0.2);

  const gradText = {
    background:
      "linear-gradient(135deg, #a78bfa 0%, #818cf8 55%, #c084fc 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,600;1,700&family=Outfit:wght@300;400;500;600&display=swap');

        .about-page {
          color: #e8e6f0;
          font-family: 'Outfit', sans-serif;
          background: #020204;
          overflow-x: hidden;
          position: relative;
          /* isolate stacking context so fixed blobs clip to this page */
        }

        .about-page *,
        .about-page *::before,
        .about-page *::after {
          box-sizing: border-box;
        }

        .about-page ::selection {
          background: #a78bfa28;
          color: #e8e6f0;
        }

        /* Scrollbar — scoped to the page element only */
        .about-page::-webkit-scrollbar { width: 4px; }
        .about-page::-webkit-scrollbar-track { background: transparent; }
        .about-page::-webkit-scrollbar-thumb { background: #a78bfa30; border-radius: 2px; }

        /* Horizontal rule accent */
        .about-page .ap-hr {
          width: 36px; height: 1px;
          background: #a78bfa; opacity: 0.6;
          display: inline-block; vertical-align: middle;
          margin-right: 12px;
        }

        /* Noise grain overlay — pseudo on the wrapper, not body */
        .about-page::after {
          content: '';
          position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 9999;
          opacity: 0.022;
        }

        /* Keyframes — these are global by nature but use namespaced names */
        @keyframes ap-float-y {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-16px); }
        }
        @keyframes ap-spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ap-pulse-blob {
          0%, 100% { opacity: 0.07; }
          50%       { opacity: 0.13; }
        }

        .about-page .ap-float  { animation: ap-float-y 2s ease-in-out infinite; }
        .about-page .ap-spin   { animation: ap-spin-slow 40s linear infinite; }
        .about-page .ap-spin-fast { animation: ap-spin-slow 25s linear infinite; }
        .about-page .ap-blob   { animation: ap-pulse-blob 8s ease-in-out infinite; }
        .about-page .ap-blob-2 { animation: ap-pulse-blob 11s ease-in-out infinite 3s; }
        .about-page .ap-blob-3 { animation: ap-pulse-blob 9s ease-in-out infinite 1.5s; }
      `}</style>

      <div className="about-page" style={{ minHeight: "100vh" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
            zIndex: 0,
          }}
        >
          <div
            ref={blob1}
            className="ap-blob"
            style={{
              position: "absolute",
              top: "-10%",
              right: "-5%",
              width: "700px",
              height: "700px",
              background:
                "radial-gradient(circle, #4c1d9520 0%, transparent 65%)",
              borderRadius: "50%",
            }}
          />
          <div
            ref={blob2}
            className="ap-blob-2"
            style={{
              position: "absolute",
              top: "35%",
              left: "-12%",
              width: "550px",
              height: "550px",
              background:
                "radial-gradient(circle, #312e8118 0%, transparent 65%)",
              borderRadius: "50%",
            }}
          />
          <div
            ref={blob3}
            className="ap-blob-3"
            style={{
              position: "absolute",
              bottom: "-5%",
              right: "15%",
              width: "600px",
              height: "600px",
              background:
                "radial-gradient(circle, #6b21a814 0%, transparent 65%)",
              borderRadius: "50%",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(to right, #ffffff02 1px, transparent 1px), linear-gradient(to bottom, #ffffff02 1px, transparent 1px)",
              backgroundSize: "72px 72px",
            }}
          />
        </div>

        <section
          style={{
            position: "relative",
            zIndex: 10,
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "0 8vw",
            paddingTop: "120px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "28px",
            }}
          >
            <span className="ap-hr" />
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#a78bfa",
                fontWeight: "600",
              }}
            >
              About BioBlitz
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(52px, 9vw, 124px)",
              fontWeight: "900",
              lineHeight: "0.95",
              letterSpacing: "-0.03em",
              color: "#e8e6f0",
              maxWidth: "900px",
              marginBottom: "36px",
            }}
          >
            Built by
            <br />
            <span style={gradText}>students,</span>
            <br />
            <em>for students.</em>
          </h1>

          <p
            style={{
              maxWidth: "400px",
              color: "#5a5870",
              fontSize: "17px",
              lineHeight: "1.8",
              fontWeight: "300",
              marginBottom: "60px",
            }}
          >
            Three high schoolers. 18 hours at a hackathon. 10 months of
            building. One platform to change how biology is learned.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "#2a2848",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "38px",
                border: "1px solid #2a2848",
                borderRadius: "100px",
                display: "flex",
                justifyContent: "center",
                paddingTop: "6px",
              }}
            >
              <div
                className="ap-float"
                style={{
                  width: "3px",
                  height: "8px",
                  background: "linear-gradient(180deg,#a78bfa,#818cf8)",
                  borderRadius: "2px",
                }}
              />
            </div>
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Scroll
            </span>
          </div>

          <div
            className="ap-spin"
            style={{
              position: "absolute",
              right: "8vw",
              top: "50%",
              transform: "translateY(-50%)",
              width: "240px",
              height: "240px",
              opacity: 0.1,
              pointerEvents: "none",
            }}
          >
            <svg
              viewBox="0 0 240 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="120"
                cy="120"
                r="110"
                stroke="#a78bfa"
                strokeWidth="1"
                strokeDasharray="6 10"
              />
              <circle
                cx="120"
                cy="120"
                r="76"
                stroke="#818cf8"
                strokeWidth="1"
                strokeDasharray="3 14"
              />
              <circle
                cx="120"
                cy="120"
                r="42"
                stroke="#c084fc"
                strokeWidth="1"
              />
            </svg>
          </div>
        </section>

        <section
          style={{ position: "relative", zIndex: 10, padding: "0 8vw 120px" }}
        >
          <FadeUp>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "1px",
                background: "#1a1a2e",
                border: "1px solid #1a1a2e",
                borderRadius: "16px",
                overflow: "hidden",
                maxWidth: "780px",
              }}
            >
              {[
                { n: 18, s: "hrs", l: "Hackathon" },
                { n: 10, s: "mo", l: "In development" },
                { n: 3, s: "", l: "Founders" },
                { n: 100, s: "%", l: "Free tier" },
              ].map(({ n, s, l }) => (
                <div
                  key={l}
                  style={{
                    background: "#020204",
                    padding: "32px 24px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "48px",
                      fontWeight: "700",
                      lineHeight: 1,
                      marginBottom: "8px",
                      ...gradText,
                    }}
                  >
                    <CountUp end={n} suffix={s} />
                  </div>
                  <div
                    style={{
                      color: "#2a2848",
                      fontSize: "11px",
                      fontWeight: "500",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>
        </section>

        <section
          style={{
            position: "relative",
            zIndex: 10,
            padding: "80px 8vw 140px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "80px",
              alignItems: "center",
              maxWidth: "1100px",
            }}
          >
            <FadeUp>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <span className="ap-hr" />
                <span
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#4a4860",
                    fontWeight: "600",
                  }}
                >
                  Origin
                </span>
              </div>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(34px, 4vw, 56px)",
                  fontWeight: "700",
                  lineHeight: "1.1",
                  letterSpacing: "-0.02em",
                  color: "#e8e6f0",
                }}
              >
                Half an hour
                <br />
                of sleep.
                <br />
                <em style={gradText}>A lot of coffee.</em>
              </h2>
            </FadeUp>

            <FadeUp delay={0.15}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                {[
                  "It began at HackTJ, a hackathon for high school students. We spent 18 hours coding the original version of BioBlitz, getting about half an hour of sleep. It was crude, but it worked. The judges didn't agree.",
                  "But we knew the idea had real potential. So we spent the next 10 months developing it during school breaks, refining every single detail.",
                  "BioBlitz is what we wished existed when we were cramming for biology exams. Now it's here — giving bio kids a place to grind, grow, and build community.",
                ].map((t, i) => (
                  <p
                    key={i}
                    style={{
                      color: i === 0 ? "#7a788a" : "#4a4858",
                      fontSize: "16px",
                      lineHeight: "1.85",
                      fontWeight: "300",
                    }}
                  >
                    {t}
                  </p>
                ))}
                <div
                  style={{
                    display: "flex",
                    marginTop: "16px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "9px",
                      left: 0,
                      right: 0,
                      height: "1px",
                      background: "#1a1a2e",
                    }}
                  />
                  {["HackTJ", "3 mo", "6 mo", "Launch"].map((l, i) => (
                    <div
                      key={l}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems:
                          i === 0
                            ? "flex-start"
                            : i === 3
                              ? "flex-end"
                              : "center",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background:
                            i === 0 || i === 3 ? "#a78bfa" : "#0b0b14",
                          border: "1px solid #a78bfa45",
                          marginBottom: "10px",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#2a2848",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        {l}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        <section
          style={{ position: "relative", zIndex: 10, padding: "80px 0 120px" }}
        >
          <div style={{ padding: "0 8vw", marginBottom: "60px" }}>
            <FadeUp>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <span className="ap-hr" />
                <span
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#4a4860",
                    fontWeight: "600",
                  }}
                >
                  The Team
                </span>
              </div>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(34px, 4vw, 56px)",
                  fontWeight: "700",
                  lineHeight: "1.1",
                  letterSpacing: "-0.02em",
                  color: "#e8e6f0",
                }}
              >
                The Team.
              </h2>
            </FadeUp>
          </div>
          <TeamCarousel />
        </section>

        <section
          style={{
            position: "relative",
            zIndex: 10,
            padding: "80px 8vw 120px",
          }}
        >
          <div style={{ borderTop: "1px solid #1a1a2e", paddingTop: "80px" }}>
            <FadeUp>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "60px",
                }}
              >
                <span className="ap-hr" />
                <span
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#4a4860",
                    fontWeight: "600",
                  }}
                >
                  Our values
                </span>
              </div>
            </FadeUp>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1px",
                background: "#1a1a2e",
              }}
            >
              {[
                {
                  n: "01",
                  t: "Radically accessible.",
                  b: "Prep courses cost thousands of dollars, gatekeeping top-tier science education. Talent is distributed equally — opportunity is not. BioBlitz keeps core features free.",
                },
                {
                  n: "02",
                  t: "Built with you.",
                  b: "We're constantly learning, just like you. If you find a mistake or have a feature idea, email us directly. We read every message. This is co-creation.",
                },
                {
                  n: "03",
                  t: "Ruthlessly honest.",
                  b: "No inflated claims. If a question has a mistake, we fix it. If a feature is broken, we own it. We'd rather be small and trusted than big and sloppy.",
                },
              ].map(({ n, t, b }, i) => (
                <FadeUp key={n} delay={i * 0.1}>
                  <div
                    style={{
                      background: "#020204",
                      padding: "48px 36px",
                      minHeight: "260px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                      transition: "background 0.25s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#0b0b14")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#020204")
                    }
                  >
                    <span
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "13px",
                        fontWeight: "700",
                        letterSpacing: "0.1em",
                        ...gradText,
                      }}
                    >
                      {n}
                    </span>
                    <h3
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "24px",
                        fontWeight: "700",
                        color: "#e8e6f0",
                        lineHeight: "1.2",
                      }}
                    >
                      {t}
                    </h3>
                    <p
                      style={{
                        color: "#4a4858",
                        fontSize: "15px",
                        lineHeight: "1.8",
                        fontWeight: "300",
                        flex: 1,
                      }}
                    >
                      {b}
                    </p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        <section
          style={{ position: "relative", zIndex: 10, padding: "80px 8vw 80px" }}
        >
          <FadeUp>
            <div
              style={{
                background: "linear-gradient(135deg, #0b0b14 0%, #0f0a1a 100%)",
                border: "1px solid #2a2848",
                borderRadius: "24px",
                padding: "clamp(40px, 6vw, 80px)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "40px",
                flexWrap: "wrap",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                className="ap-spin-fast"
                style={{
                  position: "absolute",
                  right: "-60px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "320px",
                  height: "320px",
                  opacity: 0.06,
                  pointerEvents: "none",
                }}
              >
                <svg viewBox="0 0 320 320" fill="none">
                  <circle
                    cx="160"
                    cy="160"
                    r="150"
                    stroke="#a78bfa"
                    strokeWidth="2"
                    strokeDasharray="8 14"
                  />
                  <circle
                    cx="160"
                    cy="160"
                    r="110"
                    stroke="#818cf8"
                    strokeWidth="1"
                    strokeDasharray="4 18"
                  />
                </svg>
              </div>
              <div
                style={{ position: "relative", zIndex: 1, maxWidth: "500px" }}
              >
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "clamp(28px, 3.5vw, 46px)",
                    fontWeight: "700",
                    letterSpacing: "-0.02em",
                    color: "#e8e6f0",
                    lineHeight: "1.15",
                    marginBottom: "16px",
                  }}
                >
                  Want to talk biology?
                </h2>
                <p
                  style={{
                    color: "#4a4858",
                    fontSize: "16px",
                    lineHeight: "1.7",
                    fontWeight: "300",
                  }}
                >
                  Reach out directly — we're still students, and we actually
                  reply.
                </p>
              </div>
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <a
                  href="mailto:hello@bioblitz.com"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    background: "linear-gradient(135deg, #7c3aed, #4338ca)",
                    color: "#fff",
                    padding: "14px 28px",
                    borderRadius: "100px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: "600",
                    letterSpacing: "0.02em",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 12px 40px #7c3aed30";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  Email us
                </a>
                <Link
                  href="/discord"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    background: "transparent",
                    color: "#e8e6f0",
                    padding: "14px 28px",
                    borderRadius: "100px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    border: "1px solid #2a2848",
                    transition: "border-color 0.2s, color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#a78bfa55";
                    e.currentTarget.style.color = "#a78bfa";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#2a2848";
                    e.currentTarget.style.color = "#e8e6f0";
                  }}
                >
                  Join Discord
                </Link>
              </div>
            </div>
          </FadeUp>
        </section>

        <footer
          style={{
            position: "relative",
            zIndex: 10,
            borderTop: "1px solid #1a1a2e",
            padding: "40px 8vw",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: "700",
              fontSize: "16px",
              color: "#a78bfa",
            }}
          ></span>
          <div style={{ display: "flex", gap: "28px" }}>
            {[
              ["Privacy", "/privacy-policy"],
              ["Terms", "/terms-and-service"],
              ["About", "/about"],
            ].map(([l, h]) => (
              <Link
                key={l}
                href={h}
                style={{
                  color: "#2a2848",
                  fontSize: "13px",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#a78bfa")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#2a2848")}
              >
                {l}
              </Link>
            ))}
          </div>
          <span style={{ color: "#1e1c2e", fontSize: "13px" }}>
            © {new Date().getFullYear()} BioBlitz · Powered by{" "}
            <Link
              href="https://mitosisphere.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#2a2848",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#a78bfa")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#2a2848")}
            >
              Mitosisphere
            </Link>
          </span>
        </footer>
      </div>
    </>
  );
}
