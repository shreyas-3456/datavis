"use client";

import Link from "next/link";
import { AnimateIn } from "@/components/marketing/AnimateIn";
import { useEffect, useRef, useState } from "react";

const FEATURES = [
  {
    category: "Data Ingestion",
    icon: "📥",
    color: "from-blue-500/20 to-blue-600/5",
    border: "border-blue-500/20",
    accent: "text-blue-400",
    items: [
      { title: "Drag & Drop Upload", description: "Upload CSV, Excel (.xlsx), and JSON files with drag and drop. Files are validated instantly on upload.", detail: "Supports files up to 500MB. Auto-detects delimiters, encodings, and headers." },
      { title: "Schema Detection", description: "Automatically infers column types — numerical, categorical, datetime, boolean — so you don't have to.", detail: "Uses Pandas + PyArrow under the hood for fast, accurate type inference." },
      { title: "Data Quality Report", description: "Missing values, duplicate rows, outliers — all surfaced automatically on upload.", detail: "Each column gets a quality score with actionable suggestions." },
    ],
  },
  {
    category: "Analytics Engine",
    icon: "⚡",
    color: "from-yellow-500/20 to-yellow-600/5",
    border: "border-yellow-500/20",
    accent: "text-yellow-400",
    items: [
      { title: "DuckDB Powered", description: "Run analytical queries on millions of rows in milliseconds using DuckDB — built for OLAP speed.", detail: "Columnar storage, vectorized execution, no database server required." },
      { title: "SQL Transformations", description: "Write raw SQL or use the visual query builder. Filter, group, aggregate, join — full SQL support.", detail: "Queries are cached and re-used intelligently to reduce processing time." },
      { title: "Background Processing", description: "Large dataset operations run asynchronously via Celery workers. No timeouts, no blocking.", detail: "Real-time progress tracking via WebSocket updates." },
    ],
  },
  {
    category: "Visualization",
    icon: "📊",
    color: "from-indigo-500/20 to-indigo-600/5",
    border: "border-indigo-500/20",
    accent: "text-indigo-400",
    items: [
      { title: "8 Chart Types", description: "Line, Bar, Area, Pie, Scatter, Heatmap, Treemap, Histogram — all powered by Apache ECharts.", detail: "Every chart is animated, responsive, and interactive out of the box." },
      { title: "Smart Suggestions", description: "AI recommends the best chart type based on your data schema and the question you're asking.", detail: "Time series → Line. Categories → Bar. Distributions → Histogram. Correlations → Scatter." },
      { title: "Dashboard Builder", description: "Drag and drop charts onto a responsive canvas. Resize, reorder, and group widgets freely.", detail: "Layouts are saved and shareable with a single link." },
    ],
  },
  {
    category: "AI Features",
    icon: "🤖",
    color: "from-purple-500/20 to-purple-600/5",
    border: "border-purple-500/20",
    accent: "text-purple-400",
    items: [
      { title: "Natural Language Queries", description: 'Type "Show monthly revenue by region" and get a chart. No SQL, no config.', detail: "Converts plain English into SQL + chart config automatically." },
      { title: "Insight Generation", description: "Automatically detects anomalies, trends, and outliers and surfaces them as readable insights.", detail: "Each insight links directly to the chart and data that supports it." },
      { title: "Summary Statistics", description: "Get a plain-English summary of any dataset — distributions, correlations, notable patterns.", detail: "Generated on upload and updated when data changes." },
    ],
  },
  {
    category: "Security & Access",
    icon: "🔐",
    color: "from-green-500/20 to-green-600/5",
    border: "border-green-500/20",
    accent: "text-green-400",
    items: [
      { title: "JWT Authentication", description: "Secure login with HTTP-only cookies. Tokens rotate automatically. Google OAuth supported.", detail: "Access tokens expire in 30 minutes. Refresh tokens last 7 days." },
      { title: "Role-Based Access", description: "Assign Admin, Editor, or Viewer roles to team members. Control who can edit or share.", detail: "Per-dashboard permissions coming soon." },
      { title: "Shareable Dashboards", description: "Share a read-only link to any dashboard. Recipients don't need an account.", detail: "Expiring share links with optional password protection." },
    ],
  },
];

function FloatingOrb({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={style}
    />
  );
}

export default function FeaturesPage() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div className="font-body min-h-screen pt-32 pb-24 px-6 overflow-hidden">

      <style>{`
        @keyframes heroGlow {
          0%,100% { opacity:.15; transform:scale(1); }
          50%      { opacity:.25; transform:scale(1.05); }
        }
        @keyframes lineGrow {
          from { transform:scaleX(0); }
          to   { transform:scaleX(1); }
        }
        .line-grow { animation: lineGrow .8s ease-out forwards; transform-origin:left; }
        .card-hover { transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(99,102,241,.1); }
      `}</style>

      {/* Background orbs */}
      <FloatingOrb style={{ width:600,height:600,background:"radial-gradient(circle,rgba(79,70,229,.12) 0%,transparent 70%)",top:"-10%",left:"50%",transform:"translateX(-50%)",animation:"heroGlow 8s ease-in-out infinite" }} />
      <FloatingOrb style={{ width:400,height:400,background:"radial-gradient(circle,rgba(139,92,246,.08) 0%,transparent 70%)",bottom:"20%",right:"-5%",animation:"orb-drift 18s ease-in-out infinite" }} />

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Header */}
        <div className="text-center mb-24">
          <AnimateIn direction="none">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium px-4 py-2 rounded-full mb-8">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
              Full feature breakdown
            </div>
          </AnimateIn>

          <AnimateIn delay={100}>
            <h1 className="font-display text-6xl md:text-7xl font-bold text-white mb-6 leading-[.95] tracking-tight">
              Built for serious<br />
              <span className="shimmer-text">data work</span>
            </h1>
          </AnimateIn>

          <AnimateIn delay={200}>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Every feature is designed to get you from raw data to actionable insight
              as fast as possible — without compromising on depth or control.
            </p>
          </AnimateIn>

          {/* Animated stat bar */}
          <AnimateIn delay={300}>
            <div className="flex items-center justify-center gap-10 mt-12 flex-wrap">
              {[
                { label: "Chart types", value: "8+" },
                { label: "File formats", value: "3" },
                { label: "Query engine", value: "DuckDB" },
                { label: "AI powered", value: "Yes" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="font-display text-3xl font-bold text-white">{s.value}</div>
                  <div className="text-gray-500 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </AnimateIn>
        </div>

        {/* Feature categories */}
        <div className="space-y-28">
          {FEATURES.map((category, ci) => (
            <div key={category.category}>
              <AnimateIn direction="left">
                <div className="flex items-center gap-4 mb-10">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${category.color} border ${category.border} flex items-center justify-center text-xl`}>
                    {category.icon}
                  </div>
                  <h2 className={`font-display text-2xl font-bold ${category.accent}`}>{category.category}</h2>
                  <div className="flex-1 h-px bg-gray-800 ml-2 line-grow" />
                </div>
              </AnimateIn>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {category.items.map((item, ii) => (
                  <AnimateIn key={item.title} delay={ii * 100} direction="up">
                    <div
                      className={`card-hover relative bg-gray-900/60 border rounded-2xl p-6 cursor-default h-full ${hoveredCard === `${ci}-${ii}` ? `${category.border} bg-gray-900` : "border-gray-800"}`}
                      onMouseEnter={() => setHoveredCard(`${ci}-${ii}`)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      {/* Glow on hover */}
                      <div
                        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${category.color} transition-opacity duration-300 pointer-events-none`}
                        style={{ opacity: hoveredCard === `${ci}-${ii}` ? 1 : 0 }}
                      />
                      <div className="relative z-10">
                        <h3 className="text-white font-semibold mb-3">{item.title}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed mb-4">{item.description}</p>
                        <div className="pt-4 border-t border-gray-800/80">
                          <p className="text-gray-600 text-xs leading-relaxed">{item.detail}</p>
                        </div>
                      </div>
                    </div>
                  </AnimateIn>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <AnimateIn delay={100} className="mt-28">
          <div className="relative bg-gray-900 border border-gray-800 rounded-3xl p-12 text-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background:"radial-gradient(circle at 50% 0%,rgba(99,102,241,.15) 0%,transparent 60%)" }} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20" style={{ background:"linear-gradient(to bottom,#4f46e5,transparent)" }} />
            <h2 className="font-display text-4xl font-bold text-white mb-3 relative">Ready to try it?</h2>
            <p className="text-gray-500 text-sm mb-8 relative">Free plan available. No credit card required.</p>
            <Link
              href="/auth/signup"
              className="relative inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors duration-200"
            >
              Get started free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </AnimateIn>
      </div>
    </div>
  );
}