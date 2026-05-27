"use client";

import { useState } from "react";
import { useSeeds, useLinkSeed } from "@/lib/hooks/useSeeds";
import type { SeedDataset } from "@/lib/actions/seed.actions";

const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
  finance:     { bg: "bg-blue-950/60",   text: "text-blue-400"   },
  environment: { bg: "bg-emerald-950/60",text: "text-emerald-400" },
  healthcare:  { bg: "bg-red-950/60",    text: "text-red-400"    },
  social:      { bg: "bg-violet-950/60", text: "text-violet-400" },
  education:   { bg: "bg-amber-950/60",  text: "text-amber-400"  },
  food:        { bg: "bg-orange-950/60", text: "text-orange-400" },
  geoscience:  { bg: "bg-stone-800/60",  text: "text-stone-400"  },
};

const DOMAIN_ACTIVE: Record<string, string> = {
  finance:     "text-blue-400 border-blue-400/40",
  environment: "text-emerald-400 border-emerald-400/40",
  healthcare:  "text-red-400 border-red-400/40",
  social:      "text-violet-400 border-violet-400/40",
  education:   "text-amber-400 border-amber-400/40",
  food:        "text-orange-400 border-orange-400/40",
  geoscience:  "text-stone-400 border-stone-400/40",
};

function domainStyle(domain: string | null) {
  return DOMAIN_COLORS[domain ?? ""] ?? { bg: "bg-slate-800/60", text: "text-slate-400" };
}

function fmt(n: number | null) {
  if (n == null) return "—";
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000
    ? `${(n / 1000).toFixed(1)}k`
    : String(n);
}

// ── Single card ───────────────────────────────────────────────

function SeedCard({ seed, onLink }: { seed: SeedDataset; onLink: (key: string) => void }) {
  const { mutate, isPending, isSuccess, error } = useLinkSeed();
  const { bg, text } = domainStyle(seed.domain);

  function handleAdd() {
    mutate(seed.seed_key, { onSuccess: () => onLink(seed.seed_key) });
  }

  const alreadyAdded =
    isSuccess ||
    ((error as Error | null)?.message ?? "").includes("409") ||
    ((error as Error | null)?.message ?? "").toLowerCase().includes("already");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 shadow-sm hover:border-slate-600/70 hover:bg-slate-800/80 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-100 leading-snug">{seed.name}</p>
        {seed.domain && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium border border-transparent ${bg} ${text}`}>
            {seed.domain}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
        {seed.description}
      </p>

      {/* Stats strip */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <span>{fmt(seed.row_count)} rows</span>
        <span className="text-slate-700">·</span>
        <span>{seed.column_count ?? "—"} cols</span>
        <span className="text-slate-700">·</span>
        <span>{seed.file_size_mb != null ? `${seed.file_size_mb} MB` : "—"}</span>
        {seed.source_url && (
          <>
            <span className="text-slate-700">·</span>
            
              <a href={seed.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
            >
              {seed.source}
            </a>
          </>
        )}
      </div>

      {/* Action */}
      <div className="mt-auto pt-1">
        {isSuccess || alreadyAdded ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {alreadyAdded && !isSuccess ? "Already in your datasets" : "Added to your datasets"}
          </div>
        ) : (
          <>
            <button
              onClick={handleAdd}
              disabled={isPending}
              className="w-full rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Adding…" : "Add to my datasets"}
            </button>
            {error && !alreadyAdded && (
              <p className="mt-1.5 text-xs text-red-400">
                {(error as Error).message}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Browser ───────────────────────────────────────────────────

export default function SeedDatasetBrowser({ onClose }: { onClose?: () => void }) {
  const { data: seeds, isLoading, error } = useSeeds();
  const [search, setSearch] = useState("");
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [linked, setLinked] = useState<Set<string>>(new Set());

  const domains = [
    ...new Set((seeds ?? []).map((s) => s.domain).filter(Boolean)),
  ] as string[];

  const filtered = (seeds ?? []).filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(q) ||
      (s.description ?? "").toLowerCase().includes(q) ||
      (s.domain ?? "").toLowerCase().includes(q);
    const matchDomain = !activeDomain || s.domain === activeDomain;
    return matchSearch && matchDomain;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Sample Datasets</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-world datasets ready to explore — added instantly, no upload needed.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="self-start sm:self-auto text-xs text-slate-500 hover:text-slate-300 transition-colors mt-1 sm:mt-0"
          >
            ✕ Close
          </button>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search datasets…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500/30 transition-colors"
      />

      {/* Domain filter pills */}
      {domains.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveDomain(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              activeDomain === null
                ? "bg-slate-100 text-slate-900 border-slate-100"
                : "bg-transparent text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-300"
            }`}
          >
            All
          </button>
          {domains.map((d) => {
            const { bg, text } = domainStyle(d);
            const activeClass = DOMAIN_ACTIVE[d] ?? "text-slate-400 border-slate-400/40";
            return (
              <button
                key={d}
                onClick={() => setActiveDomain(activeDomain === d ? null : d)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  activeDomain === d
                    ? `${bg} ${activeClass} border`
                    : "bg-transparent text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-300"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">Failed to load sample datasets.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No datasets match your search.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((seed) => (
            <SeedCard
              key={seed.seed_key}
              seed={seed}
              onLink={(key) => setLinked((prev) => new Set(prev).add(key))}
            />
          ))}
        </div>
      )}
    </div>
  );
}