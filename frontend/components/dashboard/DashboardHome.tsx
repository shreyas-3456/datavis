"use client";

import { useState, useEffect, useRef } from "react";
import { useDatasets } from "@/lib/hooks/useDatasets";
import { DatasetCard } from "@/components/datasets/DatasetCard";
import { DatasetPreviewDrawer } from "@/components/datasets/DatasetPreviewDrawer";
import { DatasetDropzone } from "@/components/datasets/DatasetDropzone";
import type { Dataset } from "@/lib/api/datasets";

// ── Upload sheet (slides up from bottom) ─────────────────────────────────────

function UploadSheet({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "hsl(220 13% 4% / 0.65)",
          backdropFilter: "blur(6px)",
          zIndex: 40,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 250ms",
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed",
        bottom: 0,
        zIndex: 50,
        background: "hsl(220 13% 10%)",
        borderTop: "1px solid hsl(220 13% 20%)",
        borderRadius: "20px 20px 0 0",
        padding: "28px 32px 40px",
        transition: "transform 320ms cubic-bezier(0.32, 0, 0.15, 1)",
        boxShadow: "0 -24px 80px hsl(220 13% 4% / 0.6)",
        maxWidth: 800,
        margin: "0 auto",
        width: "100%",
        left: "50%",
        right: "auto",
        transform: open
          ? "translateX(-50%) translateY(0)"
          : "translateX(-50%) translateY(100%)",
      }}>
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: "hsl(220 13% 28%)",
          margin: "0 auto 20px",
        }} />

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}>
          <div>
            <h2 style={{
              fontSize: 16, fontWeight: 700,
              color: "hsl(220 13% 92%)",
              margin: 0, letterSpacing: "-0.01em",
            }}>
              Upload dataset
            </h2>
            <p style={{ fontSize: 12, color: "hsl(220 13% 48%)", margin: "3px 0 0" }}>
              CSV, Excel, or JSON — up to 100 MB
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: "1px solid hsl(220 13% 24%)",
              background: "transparent",
              color: "hsl(220 13% 55%)",
              cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <DatasetDropzone onUploaded={() => { onUploaded(); onClose(); }} />
      </div>
    </>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div style={{
      background: "hsl(220 13% 11%)",
      border: "1px solid hsl(220 13% 19%)",
      borderRadius: 14,
      padding: "18px 20px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* accent glow */}
      <div style={{
        position: "absolute",
        top: -20, right: -20,
        width: 80, height: 80,
        borderRadius: "50%",
        background: `${accent}18`,
        filter: "blur(20px)",
        pointerEvents: "none",
      }} />
      <p style={{
        fontSize: 11, fontWeight: 600,
        color: "hsl(220 13% 45%)",
        margin: "0 0 8px",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 28, fontWeight: 700,
        color: "hsl(220 13% 93%)",
        margin: 0, letterSpacing: "-0.03em",
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 12, color: "hsl(220 13% 48%)", margin: "4px 0 0" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Skeleton row (reused from datasets page) ──────────────────────────────────

function SkeletonRow() {
  return (
    <div style={{
      background: "hsl(220 13% 11%)",
      border: "1px solid hsl(220 13% 18%)",
      borderRadius: 14,
      padding: "16px 20px",
      display: "flex", alignItems: "flex-start", gap: 14,
    }}>
      <div style={sk(40, 40, 10)} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={sk(160, 16)} />
          <div style={{ display: "flex", gap: 8 }}>
            <div style={sk(64, 22, 20)} />
            <div style={sk(64, 26, 7)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {[50, 40, 55, 48].map((w, i) => <div key={i} style={sk(w, 12)} />)}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[88, 72, 96, 80, 68].map((w, i) => <div key={i} style={sk(w, 24, 6)} />)}
        </div>
      </div>
    </div>
  );
}

function sk(w: number, h: number, r = 6): React.CSSProperties {
  return {
    width: w, height: h, borderRadius: r,
    background: "hsl(220 13% 17%)",
    animation: "pulse 1.6s ease-in-out infinite",
    flexShrink: 0,
  };
}

// ── Greeting ──────────────────────────────────────────────────────────────────

function greeting(name: string | null): string {
  const hour = new Date().getHours();
  const salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return name ? `${salutation}, ${name.split(" ")[0]}` : salutation;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function DashboardHome({ userName }: { userName: string | null }) {
  const { data, isLoading, refetch } = useDatasets();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null);

  const datasets = data?.items ?? [];
  const total = data?.total ?? 0;
  const ready = datasets.filter((d) => d.status === "ready").length;
  const processing = datasets.filter(
    (d) => d.status === "processing" || d.status === "pending"
  ).length;

  const [greetingText, setGreetingText] = useState("Hello");

useEffect(() => {
  const hour = new Date().getHours();

  const salutation =
    hour < 12
      ? "Good morning"
      : hour < 17
        ? "Good afternoon"
        : "Good evening";

  setGreetingText(
    userName
      ? `${salutation}, ${userName.split(" ")[0]}`
      : salutation
  );
}, [userName]);

  // Compute total rows across ready datasets
  const totalRows = datasets.reduce((sum, d) => sum + (d.row_count ?? 0), 0);
  const fmtRows = totalRows >= 1_000_000
    ? `${(totalRows / 1_000_000).toFixed(1)}M`
    : totalRows >= 1_000
    ? `${(totalRows / 1_000).toFixed(1)}K`
    : String(totalRows);

  const recentDatasets = datasets.slice(0, 5);

  return (
    <div style={{
      padding: "36px 40px",
      maxWidth: 960,
      margin: "0 auto",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .dash-upload-btn:hover {
          background: hsl(220 70% 58%) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 20px hsl(220 70% 50% / 0.35) !important;
        }
        .dash-upload-btn:active {
          transform: translateY(0);
        }
        .dash-secondary-btn:hover {
          background: hsl(220 13% 18%) !important;
          border-color: hsl(220 13% 30%) !important;
          color: hsl(220 13% 80%) !important;
        }
        .dash-view-all:hover {
          color: hsl(220 13% 80%) !important;
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 32,
        gap: 16,
        flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 700,
            color: "hsl(220 13% 93%)",
            margin: "0 0 5px",
            letterSpacing: "-0.025em",
          }}>
            {greetingText}
          </h1>
          <p style={{ fontSize: 13, color: "hsl(220 13% 48%)", margin: 0 }}>
            {total === 0
              ? "You have no datasets yet. Upload one to get started."
              : `${total} dataset${total !== 1 ? "s" : ""} in your workspace`}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <a
            href="/dashboard/datasets"
            className="dash-secondary-btn"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 500,
              padding: "9px 16px", borderRadius: 10,
              border: "1px solid hsl(220 13% 24%)",
              background: "transparent",
              color: "hsl(220 13% 55%)",
              cursor: "pointer",
              textDecoration: "none",
              transition: "all 150ms",
            }}
          >
            <GridIcon />
            All datasets
          </a>
          <button
            onClick={() => setUploadOpen(true)}
            className="dash-upload-btn"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              fontSize: 13, fontWeight: 600,
              padding: "9px 18px", borderRadius: 10,
              border: "none",
              background: "hsl(220 70% 50%)",
              color: "#fff",
              cursor: "pointer",
              transition: "all 150ms",
              boxShadow: "0 2px 12px hsl(220 70% 50% / 0.25)",
            }}
          >
            <UploadIcon />
            Upload dataset
          </button>
        </div>
      </div>

      {/* ── Stat row — only show when there's data ── */}
      {total > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}>
          <StatCard
            label="Total datasets"
            value={total}
            sub={`${ready} ready`}
            accent="hsl(220 70% 55%)"
          />
          <StatCard
            label="Total rows"
            value={fmtRows || "—"}
            sub="across all datasets"
            accent="hsl(152 60% 52%)"
          />
          <StatCard
            label="Processing"
            value={processing}
            sub={processing > 0 ? "in progress…" : "queue empty"}
            accent="hsl(35 92% 60%)"
          />
          <StatCard
            label="File types"
            value={new Set(datasets.map((d) => d.file_type)).size}
            sub="formats ingested"
            accent="hsl(262 83% 70%)"
          />
        </div>
      )}

      {/* ── Recent datasets ── */}
      <div>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}>
          <h2 style={{
            fontSize: 13, fontWeight: 600,
            color: "hsl(220 13% 50%)",
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}>
            {total > 0 ? "Recent datasets" : "Datasets"}
          </h2>
          {total > 5 && (
            <a
              href="/dashboard/datasets"
              className="dash-view-all"
              style={{
                fontSize: 12, fontWeight: 500,
                color: "hsl(220 13% 45%)",
                textDecoration: "none",
                transition: "color 150ms",
              }}
            >
              View all {total} →
            </a>
          )}
        </div>

        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : datasets.length === 0 ? (
          /* ── Zero state ── */
          <div style={{
            border: "1.5px dashed hsl(220 13% 22%)",
            borderRadius: 16,
            padding: "56px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            background: "hsl(220 13% 10%)",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* subtle background glow */}
            <div style={{
              position: "absolute",
              bottom: -40, left: "50%",
              transform: "translateX(-50%)",
              width: 300, height: 100,
              borderRadius: "50%",
              background: "hsl(220 70% 50% / 0.06)",
              filter: "blur(30px)",
              pointerEvents: "none",
            }} />

            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: "hsl(220 70% 50% / 0.1)",
              border: "1px solid hsl(220 70% 50% / 0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <DatabaseIcon />
            </div>

            <div style={{ textAlign: "center" }}>
              <p style={{
                fontSize: 15, fontWeight: 600,
                color: "hsl(220 13% 75%)",
                margin: "0 0 6px",
                letterSpacing: "-0.01em",
              }}>
                No datasets yet
              </p>
              <p style={{ fontSize: 13, color: "hsl(220 13% 45%)", margin: 0 }}>
                Upload a CSV, Excel, or JSON file to start exploring your data
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                onClick={() => setUploadOpen(true)}
                className="dash-upload-btn"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  fontSize: 13, fontWeight: 600,
                  padding: "9px 18px", borderRadius: 10,
                  border: "none",
                  background: "hsl(220 70% 50%)",
                  color: "#fff",
                  cursor: "pointer",
                  transition: "all 150ms",
                  boxShadow: "0 2px 12px hsl(220 70% 50% / 0.25)",
                }}
              >
                <UploadIcon />
                Upload dataset
              </button>
              <a
                href="/dashboard/datasets"
                className="dash-secondary-btn"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 13, fontWeight: 500,
                  padding: "9px 16px", borderRadius: 10,
                  border: "1px solid hsl(220 13% 24%)",
                  background: "transparent",
                  color: "hsl(220 13% 55%)",
                  cursor: "pointer",
                  textDecoration: "none",
                  transition: "all 150ms",
                }}
              >
                Browse samples
              </a>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentDatasets.map((dataset) => (
              <DatasetCard
                key={dataset.id}
                dataset={dataset}
                onPreview={setPreviewDataset}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Upload sheet ── */}
      <UploadSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => refetch()}
      />

      {/* ── Preview drawer ── */}
      <DatasetPreviewDrawer
        dataset={previewDataset}
        onClose={() => setPreviewDataset(null)}
      />
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10V4M4 7l3-3 3 3" />
      <path d="M2 11.5h10" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="4.5" height="4.5" rx="1" />
      <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" />
      <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" />
      <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none"
      stroke="hsl(220 70% 62%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="11" cy="5" rx="8" ry="3" />
      <path d="M3 5v4c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M3 9v4c0 1.66 3.58 3 8 3s8-1.34 8-3V9" />
      <path d="M3 13v4c0 1.66 3.58 3 8 3s8-1.34 8-3v-4" />
    </svg>
  );
}
