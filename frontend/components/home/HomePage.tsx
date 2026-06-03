"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── Floating particle ──────────────────────────────────────────────────────────
function Particle({ style }: { style: React.CSSProperties }) {
  return <div className="absolute rounded-full pointer-events-none" style={style} />;
}

// ── Animated counter ───────────────────────────────────────────────────────────
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      let start = 0;
      const duration = 2000;
      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(ease * target));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      observer.disconnect();
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ── Typewriter ─────────────────────────────────────────────────────────────────
function Typewriter({ words }: { words: string[] }) {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIndex];
    let timeout: NodeJS.Timeout;

    if (!deleting && displayed.length < word.length) {
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80);
    } else if (!deleting && displayed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), 2000);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setWordIndex((i) => (i + 1) % words.length);
    }

    return () => clearTimeout(timeout);
  }, [displayed, deleting, wordIndex, words]);

  return (
    <span className="text-indigo-400">
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}

// ── Chart preview bars ─────────────────────────────────────────────────────────
function AnimatedChart() {
  const bars = [65, 85, 45, 92, 70, 55, 88, 40, 75, 95, 60, 78];
  return (
    <div className="flex items-end gap-1.5 h-24 px-2">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-gradient-to-t from-indigo-600 to-indigo-400 opacity-80"
          style={{
            height: `${h}%`,
            animation: `barRise 1s ease-out forwards`,
            animationDelay: `${i * 0.06}s`,
            transform: "scaleY(0)",
            transformOrigin: "bottom",
          }}
        />
      ))}
    </div>
  );
}

// ── Feature card ───────────────────────────────────────────────────────────────
function FeatureCard({
  icon, title, description, delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div
      className="group relative bg-gray-900/60 border border-gray-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5"
      style={{ animationDelay: delay }}
    >
      <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600/20 transition-colors duration-300">
        {icon}
      </div>
      <h3 className="text-white font-semibold mb-2 text-sm">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:to-transparent transition-all duration-500" />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function HomePage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("mousemove", handleMouse);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

const [particles, setParticles] = useState<Array<{ id: number; style: React.CSSProperties }>>([]);

useEffect(() => {
  setParticles(
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      style: {
        width: `${Math.random() * 4 + 1}px`,
        height: `${Math.random() * 4 + 1}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        background: `rgba(99, 102, 241, ${Math.random() * 0.4 + 0.1})`,
        animation: `float ${Math.random() * 10 + 8}s ease-in-out infinite`,
        animationDelay: `${Math.random() * 5}s`,
      } as React.CSSProperties,
    }))
  );
}, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        * { font-family: 'DM Sans', sans-serif; }
        h1, h2, h3, .display { font-family: 'Syne', sans-serif; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          33% { transform: translateY(-30px) translateX(15px); opacity: 0.8; }
          66% { transform: translateY(-15px) translateX(-10px); opacity: 0.5; }
        }

        @keyframes barRise {
          to { transform: scaleY(1); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes gridPulse {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.07; }
        }

        @keyframes orb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(60px, -40px) scale(1.1); }
          66% { transform: translate(-40px, 60px) scale(0.9); }
        }

        @keyframes orb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-80px, 40px) scale(0.9); }
          66% { transform: translate(50px, -60px) scale(1.1); }
        }

        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }

        @keyframes dash {
          to { stroke-dashoffset: 0; }
        }

        .shimmer-text {
          background: linear-gradient(90deg, #fff 0%, #a5b4fc 30%, #fff 60%, #a5b4fc 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }

        .hero-animate { animation: fadeUp 0.8s ease-out forwards; opacity: 0; }
        .fade-in { animation: fadeIn 1s ease-out forwards; opacity: 0; }

        .glow-btn {
          position: relative;
          overflow: hidden;
        }
        .glow-btn::before {
          content: '';
          position: absolute;
          top: -2px; left: -2px; right: -2px; bottom: -2px;
          background: linear-gradient(45deg, #4f46e5, #818cf8, #4f46e5);
          border-radius: inherit;
          z-index: -1;
          background-size: 200%;
          animation: shimmer 2s linear infinite;
        }

        .card-3d {
          transform-style: preserve-3d;
          transition: transform 0.3s ease;
        }
        .card-3d:hover {
          transform: perspective(1000px) rotateX(-2deg) rotateY(2deg) translateZ(10px);
        }

        .noise {
          position: relative;
        }
        .noise::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: 0.4;
        }
      `}</style>

      <div className="min-h-screen bg-gray-950 noise overflow-x-hidden">

        {/* ── Cursor glow ── */}
        <div
          className="Watch demo"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)",
            left: mousePos.x - 192,
            top: mousePos.y - 192,
          }}
        />

        {/* ── Grid background ── */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            animation: "gridPulse 6s ease-in-out infinite",
          }}
        />

        {/* ── Particles ── */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <Particle key={p.id} style={p.style} />
          ))}
        </div>

        {/* ── Navbar ── */}
        <nav
          className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
          style={{
            background: scrollY > 50 ? "rgba(3,7,18,0.9)" : "transparent",
            backdropFilter: scrollY > 50 ? "blur(20px)" : "none",
            borderBottom: scrollY > 50 ? "1px solid rgba(99,102,241,0.1)" : "none",
          }}
        >
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg display">DataVis</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              {["Features", "Pricing", "Docs", "Blog"].map((item) => (
                <a key={item} href={item.toLowerCase()} className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                  {item}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link href="/auth/login" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="glow-btn bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Get started
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-16">

          {/* Orbs */}
          <div
            className="absolute w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
            style={{
              background: "radial-gradient(circle, #4f46e5 0%, transparent 70%)",
              top: "10%", left: "5%",
              animation: "orb1 15s ease-in-out infinite",
            }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none"
            style={{
              background: "radial-gradient(circle, #818cf8 0%, transparent 70%)",
              bottom: "10%", right: "5%",
              animation: "orb2 20s ease-in-out infinite",
            }}
          />

          <div className="relative z-10 text-center max-w-5xl mx-auto px-6">

       
            

            {/* Headline */}
            <h1
              className="hero-animate display text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight mb-6"
              style={{ animationDelay: "0.2s" }}
            >
              <span className="shimmer-text">Transform</span>
              <br />
              <span className="text-white">your data into</span>
              <br />
              <Typewriter words={["insights", "stories", "decisions", "clarity"]} />
            </h1>

            {/* Subheadline */}
            <p
              className="hero-animate text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
              style={{ animationDelay: "0.4s" }}
            >
              Upload any dataset. Ask questions in plain English.
              Get beautiful, interactive visualizations in seconds — powered by AI.
            </p>

            {/* CTA */}
            <div
              className="hero-animate flex items-center justify-center gap-4 flex-wrap"
              style={{ animationDelay: "0.5s" }}
            >
              <Link
                href="/auth/signup"
                className="group glow-btn bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 flex items-center gap-2"
              >
                Start for free
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <a className="flex items-center">
                <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch demo
              </a>
            </div>

            {/* Social proof */}
            <p
              className="hero-animate text-gray-600 text-sm mt-8"
              style={{ animationDelay: "0.7s" }}
            >
              No credit card required · Free plan available · Setup in 2 minutes
            </p>
          </div>
        </section>

        {/* ── Dashboard preview ── */}
        <section className="relative py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div
              className="card-3d relative rounded-2xl border border-gray-800 overflow-hidden shadow-2xl shadow-indigo-500/5"
              style={{ animation: "fadeUp 1s ease-out 0.8s forwards", opacity: 0 }}
            >
              {/* Glow border */}
              <div className="absolute inset-0 rounded-2xl" style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, transparent 50%, rgba(99,102,241,0.05) 100%)",
                pointerEvents: "none",
              }} />

              {/* Window bar */}
              <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <div className="ml-4 flex-1 bg-gray-800 rounded text-gray-600 text-xs px-3 py-1 max-w-xs">
                  app.datavis.io/dashboard
                </div>
              </div>

              {/* Dashboard content */}
              <div className="bg-gray-950 p-6">
                <div className="grid grid-cols-12 gap-4">

                  {/* Sidebar preview */}
                  <div className="col-span-2 space-y-2">
                    {["Dashboard", "Datasets", "Charts"].map((item, i) => (
                      <div
                        key={item}
                        className={`h-8 rounded-lg flex items-center px-3 text-xs ${i === 0 ? "bg-indigo-600/20 text-indigo-400" : "text-gray-600"}`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  {/* Main content */}
                  <div className="col-span-10 space-y-4">

                    {/* Stat cards */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Total Datasets", value: "24", delta: "+3" },
                        { label: "Visualizations", value: "128", delta: "+12" },
                        { label: "Queries Run", value: "4.2K", delta: "+280" },
                        { label: "Insights Found", value: "89", delta: "+7" },
                      ].map((stat) => (
                        <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                          <p className="text-gray-600 text-xs mb-1">{stat.label}</p>
                          <p className="text-white font-bold text-xl">{stat.value}</p>
                          <p className="text-green-400 text-xs mt-0.5">{stat.delta} this week</p>
                        </div>
                      ))}
                    </div>

                    {/* Charts row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <p className="text-gray-400 text-xs mb-3 font-medium">Monthly Revenue</p>
                        <AnimatedChart />
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <p className="text-gray-400 text-xs mb-3 font-medium">User Distribution</p>
                        <div className="flex items-center justify-center h-24">
                          <div className="relative w-20 h-20">
                            <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#1f2937" strokeWidth="4" />
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#4f46e5" strokeWidth="4"
                                strokeDasharray="60 88" strokeLinecap="round"
                                style={{ animation: "dash 2s ease-out forwards", strokeDashoffset: 88 }}
                              />
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#818cf8" strokeWidth="4"
                                strokeDasharray="25 88" strokeDashoffset="-60" strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">68%</span>
                            </div>
                          </div>
                          <div className="ml-4 space-y-1.5">
                            {[{ c: "bg-indigo-500", l: "Direct" }, { c: "bg-indigo-300", l: "Organic" }, { c: "bg-gray-700", l: "Referral" }].map((d) => (
                              <div key={d.l} className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${d.c}`} />
                                <span className="text-gray-500 text-xs">{d.l}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="py-20 border-y border-gray-800/50">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid grid-cols-3 gap-8 text-center">
              {[
                { value: 50000, suffix: "+", label: "Datasets analyzed" },
                { value: 99, suffix: "%", label: "Uptime guaranteed" },
                { value: 200, suffix: "ms", label: "Avg query time" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="display text-5xl font-bold text-white mb-2">
                    <Counter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-gray-500 text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-24 px-6" id="features">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-indigo-400 text-sm font-medium mb-3 uppercase tracking-widest">Features</p>
              <h2 className="display text-4xl md:text-5xl font-bold text-white mb-4">
                Everything you need to
                <br />
                <span className="shimmer-text">understand your data</span>
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                From raw CSV to stunning interactive dashboards in minutes.
                No SQL knowledge required.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>,
                  title: "Drag & Drop Upload",
                  description: "Upload CSV, Excel, or JSON files instantly. Auto-detects schema, column types, and data quality issues.",
                  delay: "0.1s",
                },
                {
                  icon: <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
                  title: "Natural Language Queries",
                  description: 'Ask "Show monthly sales by region" and get a chart instantlyWatch demo',
                  delay: "0.2s",
                },
                {
                  icon: <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
                  title: "Smart Chart Suggestions",
                  description: "AI recommends the best chart type for your data. Time series? Bar chart? Heatmap? We know.",
                  delay: "0.3s",
                },
                {
                  icon: <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
                  title: "DuckDB Analytics Engine",
                  description: "Lightning-fast analytical queries on large datasets. Aggregations in milliseconds, not minutes.",
                  delay: "0.4s",
                },
                {
                  icon: <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
                  title: "Secure by Default",
                  description: "JWT auth with HTTP-only cookies. Role-based access. Your data never leaves your control.",
                  delay: "0.5s",
                },
                {
                  icon: <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>,
                  title: "Share Dashboards",
                  description: "Share read-only links to your dashboards. Collaborate with your team in real-time.",
                  delay: "0.6s",
                },
              ].map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="relative bg-gray-900 border border-gray-800 rounded-3xl p-12 overflow-hidden">
              <div className="absolute inset-0 pointer-events-none" style={{
                background: "radial-gradient(circle at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%)",
              }} />
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24"
                style={{ background: "linear-gradient(to bottom, #4f46e5, transparent)" }}
              />
              <h2 className="display text-4xl font-bold text-white mb-4 relative">
                Ready to see your data
                <br />
                <span className="shimmer-text">differently?</span>
              </h2>
              <p className="text-gray-500 mb-8 relative">
                Join thousands of analysts and teams who use DataVis to make
                faster, smarter decisions.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap relative">
                <Link
                  href="/auth/signup"
                  className="glow-btn bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors duration-200"
                >
                  Get started for free
                </Link>
                <Link
                  href="/auth/login"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Already have an account →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-gray-800/50 py-10 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-white font-bold display">DataVis</span>
            </div>
            <p className="text-gray-600 text-sm">© 2025 DataVis Platform. All rights reserved.</p>
            <div className="flex items-center gap-6">
              {["Privacy", "Terms", "Contact"].map((item) => (
                <a key={item} href="#" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
                  {item}
                </a>
              ))}
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}