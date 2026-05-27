"use client";

import Link from "next/link";
import { AnimateIn } from "@/components/marketing/AnimateIn";
import { useState } from "react";

const SECTIONS = [
  {
    title: "Getting Started",
    slug: "getting-started",
    icon: "🚀",
    color: "from-green-500/15 to-transparent",
    border: "hover:border-green-500/30",
    description: "Set up DataVis and upload your first dataset in under 5 minutes.",
    articles: [
      { title: "Quick Start Guide", slug: "quickstart", time: "3 min" },
      { title: "Creating your account", slug: "account-setup", time: "2 min" },
      { title: "Uploading your first dataset", slug: "first-upload", time: "4 min" },
      { title: "Building your first chart", slug: "first-chart", time: "5 min" },
    ],
  },
  {
    title: "Data Upload",
    slug: "data-upload",
    icon: "📁",
    color: "from-blue-500/15 to-transparent",
    border: "hover:border-blue-500/30",
    description: "Uploading, validating, and managing datasets.",
    articles: [
      { title: "Supported file formats", slug: "file-formats", time: "2 min" },
      { title: "Schema detection explained", slug: "schema-detection", time: "4 min" },
      { title: "Handling missing values", slug: "missing-values", time: "3 min" },
      { title: "Large file best practices", slug: "large-files", time: "5 min" },
    ],
  },
  {
    title: "Analytics & Queries",
    slug: "analytics",
    icon: "🔍",
    color: "from-yellow-500/15 to-transparent",
    border: "hover:border-yellow-500/30",
    description: "Run SQL queries, build transformations, and use the analytics engine.",
    articles: [
      { title: "Writing SQL queries", slug: "sql-queries", time: "6 min" },
      { title: "Using the visual query builder", slug: "query-builder", time: "4 min" },
      { title: "Aggregations and grouping", slug: "aggregations", time: "5 min" },
      { title: "Query caching and performance", slug: "query-performance", time: "3 min" },
    ],
  },
  {
    title: "Visualizations",
    slug: "visualizations",
    icon: "📊",
    color: "from-indigo-500/15 to-transparent",
    border: "hover:border-indigo-500/30",
    description: "Build, customize, and share charts and dashboards.",
    articles: [
      { title: "Chart types overview", slug: "chart-types", time: "5 min" },
      { title: "Customizing chart appearance", slug: "chart-customization", time: "4 min" },
      { title: "Building a dashboard", slug: "dashboard-builder", time: "7 min" },
      { title: "Sharing and embedding", slug: "sharing", time: "3 min" },
    ],
  },
  {
    title: "AI Features",
    slug: "ai",
    icon: "🤖",
    color: "from-purple-500/15 to-transparent",
    border: "hover:border-purple-500/30",
    description: "Use natural language queries and AI-generated insights.",
    articles: [
      { title: "Natural language queries", slug: "nl-queries", time: "4 min" },
      { title: "Understanding AI insights", slug: "ai-insights", time: "3 min" },
      { title: "Prompt tips and examples", slug: "prompt-tips", time: "5 min" },
    ],
  },
  {
    title: "API Reference",
    slug: "api",
    icon: "⚙️",
    color: "from-gray-500/15 to-transparent",
    border: "hover:border-gray-500/30",
    description: "Integrate DataVis into your apps with the REST API.",
    articles: [
      { title: "Authentication", slug: "auth", time: "4 min" },
      { title: "Datasets API", slug: "datasets-api", time: "6 min" },
      { title: "Queries API", slug: "queries-api", time: "5 min" },
      { title: "Dashboards API", slug: "dashboards-api", time: "5 min" },
    ],
  },
];

export default function DocsPage() {
  const [search, setSearch] = useState("");

  const filtered = SECTIONS.map((s) => ({
    ...s,
    articles: s.articles.filter((a) =>
      a.title.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((s) => s.articles.length > 0 || s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="font-body min-h-screen pt-32 pb-24 px-6">
      <style>{`
        @keyframes searchPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
          50%      { box-shadow: 0 0 0 4px rgba(99,102,241,.1); }
        }
        .search-focus:focus-within { animation: searchPulse 2s ease-in-out infinite; }
        .article-link { transition: all .15s ease; }
        .article-link:hover { padding-left: 1.25rem; }
      `}</style>

      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <AnimateIn direction="up">
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium px-4 py-2 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
              Documentation
            </div>
            <h1 className="font-display text-6xl font-bold text-white mb-4 leading-tight">
              Learn DataVis
            </h1>
            <p className="text-gray-400 text-lg max-w-xl leading-relaxed">
              Guides, references, and examples — everything you need to go from
              raw data to production dashboards.
            </p>
          </div>
        </AnimateIn>

        {/* Search */}
        <AnimateIn delay={150}>
          <div className="search-focus relative mb-12 max-w-lg">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
              placeholder="Search documentation..."
              className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-500 text-white placeholder-gray-600 rounded-xl pl-11 pr-16 py-3.5 text-sm outline-none transition-colors"
            />
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">⌘K</kbd>
          </div>
        </AnimateIn>

        {/* Quick links */}
        <AnimateIn delay={200}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-16">
            {[
              { label: "Quick Start", href: "/docs/getting-started/quickstart", icon: "⚡" },
              { label: "API Docs", href: "/docs/api/auth", icon: "🔌" },
              { label: "Examples", href: "/docs/visualizations/chart-types", icon: "💡" },
              { label: "Changelog", href: "/changelog", icon: "📝" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 bg-gray-900 border border-gray-800 hover:border-indigo-500/40 hover:bg-gray-900/80 rounded-xl p-4 transition-all duration-200 group hover:-translate-y-0.5"
              >
                <span className="text-xl">{link.icon}</span>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{link.label}</span>
              </Link>
            ))}
          </div>
        </AnimateIn>

        {/* Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((section, i) => (
            <AnimateIn key={section.slug} delay={i * 60} direction="up">
              <div className={`group relative bg-gray-900/60 border border-gray-800 ${section.border} rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden h-full`}>
                {/* Gradient bg on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${section.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl`} />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{section.icon}</span>
                    <h2 className="font-display text-lg font-bold text-white">{section.title}</h2>
                  </div>
                  <p className="text-gray-500 text-sm mb-5 leading-relaxed">{section.description}</p>

                  <ul className="space-y-0.5">
                    {section.articles.map((article) => (
                      <li key={article.slug}>
                        <Link
                          href={`/docs/${section.slug}/${article.slug}`}
                          className="article-link flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800/70 transition-all duration-150 group/link"
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-gray-600 group-hover/link:text-indigo-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            {article.title}
                          </div>
                          <span className="text-xs text-gray-600 shrink-0 ml-4">{article.time}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/docs/${section.slug}`}
                    className="inline-flex items-center gap-1.5 mt-5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    View all
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>

        {/* Help */}
        <AnimateIn delay={100} className="mt-16">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-1">Can't find what you need?</h3>
              <p className="text-gray-500 text-sm">Our team is happy to help. Reach out via chat or email.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link href="/contact" className="px-5 py-2.5 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white text-sm font-medium rounded-xl transition-colors">
                Contact us
              </Link>
              <Link href="/auth/signup" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors">
                Get started free
              </Link>
            </div>
          </div>
        </AnimateIn>
      </div>
    </div>
  );
}