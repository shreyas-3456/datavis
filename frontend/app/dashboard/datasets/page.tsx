"use client";

import { useState } from "react";
import type { Dataset } from "@/lib/api/datasets";
import { useDatasets } from "@/lib/hooks/useDatasets";
import { DatasetDropzone } from "@/components/datasets/DatasetDropzone";
import { DatasetCard } from "@/components/datasets/DatasetCard";
import { DatasetPreviewDrawer } from "@/components/datasets/DatasetPreviewDrawer";

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "64px 24px",
      color: "hsl(220 13% 45%)",
      textAlign: "center",
      gap: 8,
    }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ marginBottom: 4, opacity: 0.4 }}>
        <rect x="6" y="4" width="28" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13 14h14M13 20h14M13 26h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p style={{ fontSize: 14, fontWeight: 500, color: "hsl(220 13% 58%)", margin: 0 }}>
        No datasets yet
      </p>
      <p style={{ fontSize: 13, margin: 0 }}>
        Upload a CSV, Excel, or JSON file above to get started
      </p>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      background: "hsl(220 13% 12%)",
      border: "1px solid hsl(220 13% 18%)",
      borderRadius: 14,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={skeletonStyle(120, 16)} />
        <div style={skeletonStyle(56, 20)} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={skeletonStyle(60, 14)} />
        <div style={skeletonStyle(60, 14)} />
        <div style={skeletonStyle(60, 14)} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
        {[80, 96, 72, 88].map((w, i) => <div key={i} style={skeletonStyle(w, 24)} />)}
      </div>
    </div>
  );
}

function skeletonStyle(width: number, height: number): React.CSSProperties {
  return {
    width,
    height,
    borderRadius: 6,
    background: "hsl(220 13% 18%)",
    animation: "pulse 1.6s ease-in-out infinite",
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DatasetsPage() {
  const { data, isLoading, isError, refetch } = useDatasets();
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null);
  const [showUpload, setShowUpload] = useState(true);

  const datasets = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div style={{
      padding: "32px 36px",
      maxWidth: 1200,
      margin: "0 auto",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>

      {/* ── Page header ── */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 28,
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            color: "hsl(220 13% 93%)",
            margin: "0 0 4px",
            letterSpacing: "-0.02em",
          }}>
            Datasets
          </h1>
          <p style={{ fontSize: 13, color: "hsl(220 13% 50%)", margin: 0 }}>
            {total > 0 ? `${total} dataset${total !== 1 ? "s" : ""}` : "Upload files to start analysing"}
          </p>
        </div>

        <button
          onClick={() => setShowUpload((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 13,
            fontWeight: 500,
            padding: "8px 16px",
            borderRadius: 9,
            border: "1px solid hsl(220 13% 26%)",
            background: showUpload ? "hsl(220 13% 18%)" : "transparent",
            color: showUpload ? "hsl(220 13% 85%)" : "hsl(220 13% 52%)",
            cursor: "pointer",
            transition: "background 150ms, color 150ms",
          }}
        >
          <UploadToggleIcon />
          {showUpload ? "Hide uploader" : "Upload dataset"}
        </button>
      </div>

      {/* ── Dropzone ── */}
      {showUpload && (
        <div style={{ marginBottom: 32 }}>
          <DatasetDropzone onUploaded={() => refetch()} />
        </div>
      )}

      {/* ── Error state ── */}
      {isError && (
        <div style={{
          background: "hsl(0 72% 51% / 0.08)",
          border: "1px solid hsl(0 72% 51% / 0.2)",
          borderRadius: 10,
          padding: "12px 16px",
          color: "hsl(0 72% 62%)",
          fontSize: 13,
          marginBottom: 24,
        }}>
          Failed to load datasets.{" "}
          <button
            onClick={() => refetch()}
            style={{ color: "inherit", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: "inherit" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Dataset grid ── */}
      {isLoading ? (
        <div style={gridStyle}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : datasets.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={gridStyle}>
          {datasets.map((dataset) => (
            <DatasetCard
              key={dataset.id}
              dataset={dataset}
              onPreview={setPreviewDataset}
            />
          ))}
        </div>
      )}

      {/* ── Preview drawer ── */}
      <DatasetPreviewDrawer
        dataset={previewDataset}
        onClose={() => setPreviewDataset(null)}
      />
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
  gap: 16,
};

function UploadToggleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10V4M4 7l3-3 3 3" />
      <path d="M2 11h10" />
    </svg>
  );
}
