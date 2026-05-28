"use client";

import { useState, useCallback } from "react";
import type { Dataset, ColumnSchema } from "@/lib/api/datasets";
import { useDeleteDataset } from "@/lib/hooks/useDatasets";

// ── Constants ─────────────────────────────────────────────────────────────────

const DTYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  integer: { label: "INT", color: "hsl(210 100% 62%)", bg: "hsl(210 100% 62% / 0.1)" },
  float: { label: "FLT", color: "hsl(262 83% 70%)", bg: "hsl(262 83% 70% / 0.1)" },
  string: { label: "STR", color: "hsl(152 60% 52%)", bg: "hsl(152 60% 52% / 0.1)" },
  boolean: { label: "BOOL", color: "hsl(35 92% 60%)", bg: "hsl(35 92% 60% / 0.1)" },
  datetime: { label: "DATE", color: "hsl(198 80% 58%)", bg: "hsl(198 80% 58% / 0.1)" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  ready: { label: "Ready", color: "hsl(152 55% 52%)", bg: "hsl(152 55% 52% / 0.1)", dot: "hsl(152 55% 52%)" },
  processing: { label: "Processing", color: "hsl(35 92% 60%)", bg: "hsl(35 92% 60% / 0.1)", dot: "hsl(35 92% 60%)" },
  pending: { label: "Pending", color: "hsl(220 13% 55%)", bg: "hsl(220 13% 55% / 0.1)", dot: "hsl(220 13% 55%)" },
  error: { label: "Error", color: "hsl(0 72% 60%)", bg: "hsl(0 72% 60% / 0.1)", dot: "hsl(0 72% 60%)" },
};

const FILE_TYPE_COLOR: Record<string, string> = {
  csv: "hsl(152 60% 52%)",
  xlsx: "hsl(210 100% 62%)",
  xls: "hsl(210 100% 62%)",
  json: "hsl(35 92% 60%)",
  tsv: "hsl(262 83% 70%)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatRows(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Column pill ───────────────────────────────────────────────────────────────

function ColumnPill({ col }: { col: ColumnSchema }) {
  const meta = DTYPE_META[col.dtype] ?? { label: "?", color: "hsl(220 13% 50%)", bg: "hsl(220 13% 50% / 0.1)" };
  const hasMissing = col.missing_pct > 0;

  return (
    <span
      title={`${col.name} · ${col.dtype}${hasMissing ? ` · ${col.missing_pct.toFixed(1)}% missing` : ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px 3px 6px",
        borderRadius: 6,
        border: `1px solid ${meta.color}28`,
        background: meta.bg,
        fontSize: 11.5,
        fontWeight: 500,
        color: "hsl(220 13% 78%)",
        whiteSpace: "nowrap",
        maxWidth: 160,
        overflow: "hidden",
      }}
    >
      {/* dtype badge */}
      <span style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.05em",
        color: meta.color,
        flexShrink: 0,
      }}>
        {meta.label}
      </span>

      {/* column name */}
      <span style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {col.name}
      </span>

      {/* missing indicator */}
      {hasMissing && (
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          color: "hsl(35 92% 60%)",
          flexShrink: 0,
          marginLeft: 1,
        }}>
          {col.missing_pct < 1 ? "<1%" : `${Math.round(col.missing_pct)}%`}
        </span>
      )}
    </span>
  );
}

// ── Expanded column list (shown inline below the row) ─────────────────────────

function ExpandedColumns({ schema }: { schema: ColumnSchema[] }) {
  return (
    <div style={{
      borderTop: "1px solid hsl(220 13% 17%)",
      padding: "14px 20px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <p style={{
        fontSize: 11,
        color: "hsl(220 13% 42%)",
        margin: "0 0 8px",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        fontWeight: 600,
      }}>
        All columns ({schema.length})
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 6,
      }}>
        {schema.map((col) => {
          const meta = DTYPE_META[col.dtype] ?? { label: "?", color: "hsl(220 13% 50%)", bg: "hsl(220 13% 50% / 0.1)" };
          const hasMissing = col.missing_pct > 0;

          return (
            <div
              key={col.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "7px 10px",
                borderRadius: 8,
                background: "hsl(220 13% 13%)",
                border: "1px solid hsl(220 13% 19%)",
                gap: 8,
              }}
            >
              {/* Left: dtype + name */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, overflow: "hidden" }}>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  color: meta.color,
                  background: meta.bg,
                  padding: "2px 5px",
                  borderRadius: 4,
                  flexShrink: 0,
                }}>
                  {meta.label}
                </span>
                <span style={{
                  fontSize: 12,
                  color: "hsl(220 13% 80%)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {col.name}
                </span>
              </div>

              {/* Right: nullable + missing */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {!col.nullable && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: "hsl(220 13% 40%)",
                    background: "hsl(220 13% 18%)",
                    padding: "2px 5px",
                    borderRadius: 4,
                    letterSpacing: "0.04em",
                  }}>
                    NOT NULL
                  </span>
                )}
                {hasMissing && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: hasMissing && col.missing_pct > 20
                      ? "hsl(0 72% 60%)"
                      : "hsl(35 92% 60%)",
                  }}>
                    {col.missing_pct.toFixed(1)}% missing
                  </span>
                )}
                {!hasMissing && (
                  <span style={{ fontSize: 10, color: "hsl(152 55% 45%)" }}>✓</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Spinning animation for processing status ──────────────────────────────────

const SPIN_STYLE = `
@keyframes ds-spin {
  to { transform: rotate(360deg); }
}
@keyframes ds-pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.ds-processing-dot {
  animation: ds-pulse-dot 1.2s ease-in-out infinite;
}
.ds-card-row:hover {
  background: hsl(220 13% 13%) !important;
  border-color: hsl(220 13% 24%) !important;
}
.ds-action-btn:hover {
  background: hsl(220 13% 20%) !important;
  color: hsl(220 13% 80%) !important;
}
.ds-preview-btn:hover {
  background: hsl(220 70% 55%) !important;
}
.ds-delete-btn:hover {
  background: hsl(0 72% 51% / 0.15) !important;
  color: hsl(0 72% 65%) !important;
  border-color: hsl(0 72% 51% / 0.3) !important;
}
.ds-more-pill:hover {
  background: hsl(220 13% 22%) !important;
  border-color: hsl(220 13% 30%) !important;
  color: hsl(220 13% 85%) !important;
}
`;

// ── Main card ─────────────────────────────────────────────────────────────────

const COLS_PREVIEW = 5; // how many pills to show collapsed

interface DatasetCardProps {
  dataset: Dataset;
  onPreview: (dataset: Dataset) => void;
}

export function DatasetCard({ dataset, onPreview }: DatasetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { mutate: deleteDataset, isPending: isDeleting } = useDeleteDataset();

  const schema = dataset.schema ?? [];
  const visibleCols = schema.slice(0, COLS_PREVIEW);
  const hiddenCount = schema.length - COLS_PREVIEW;
  const hasMore = hiddenCount > 0;

  const statusMeta = STATUS_META[dataset.status] ?? STATUS_META.pending;
  const isReady = dataset.status === "ready";
  const isProcessing = dataset.status === "processing" || dataset.status === "pending";

  const fileExt = dataset.file_type?.toLowerCase() ?? "";
  const fileTypeColor = FILE_TYPE_COLOR[fileExt] ?? "hsl(220 13% 50%)";

  const handleDelete = useCallback(() => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    deleteDataset(dataset.id);
  }, [confirmDelete, deleteDataset, dataset.id]);

  return (
    <>
      <style>{SPIN_STYLE}</style>

      <div style={{
        background: "hsl(220 13% 11%)",
        border: "1px solid hsl(220 13% 20%)",
        borderRadius: 14,
        overflow: "hidden",
        transition: "background 150ms, border-color 150ms",
      }}
        className="ds-card-row"
        onMouseLeave={() => setConfirmDelete(false)}
      >
        {/* ── Main row ── */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 0,
          padding: "16px 20px",
        }}>

          {/* File type badge */}
          <div style={{
            flexShrink: 0,
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${fileTypeColor}18`,
            border: `1px solid ${fileTypeColor}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
            marginTop: 1,
          }}>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.04em",
              color: fileTypeColor,
              textTransform: "uppercase",
            }}>
              {fileExt || "?"}
            </span>
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Row 1: name + status + actions */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 6,
            }}>
              {/* Name */}
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: "hsl(220 13% 92%)",
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 280,
              }}
                title={dataset.name}
              >
                {dataset.name}
              </span>

              {/* Right: status pill + actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {/* Status */}
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  color: statusMeta.color,
                  background: statusMeta.bg,
                  padding: "3px 9px",
                  borderRadius: 20,
                  letterSpacing: "0.02em",
                }}>
                  <span
                    className={isProcessing ? "ds-processing-dot" : ""}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: statusMeta.dot,
                      flexShrink: 0,
                    }}
                  />
                  {statusMeta.label}
                </span>

                {/* Preview button */}
                {isReady && (
                  <button
                    onClick={() => onPreview(dataset)}
                    className="ds-preview-btn"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 11px",
                      borderRadius: 7,
                      border: "none",
                      background: "hsl(220 70% 50%)",
                      color: "hsl(0 0% 100%)",
                      cursor: "pointer",
                      transition: "background 150ms",
                      letterSpacing: "0.01em",
                    }}
                  >
                    Preview
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="ds-delete-btn"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 7,
                    border: "1px solid hsl(220 13% 22%)",
                    background: "transparent",
                    color: confirmDelete ? "hsl(0 72% 65%)" : "hsl(220 13% 48%)",
                    cursor: isDeleting ? "wait" : "pointer",
                    transition: "all 150ms",
                  }}
                >
                  {isDeleting ? "Deleting…" : confirmDelete ? "Confirm?" : "Delete"}
                </button>
              </div>
            </div>

            {/* Row 2: meta stats */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: schema.length > 0 ? 11 : 0,
              flexWrap: "wrap",
            }}>
              <MetaStat icon={<RowsIcon />} value={isReady ? formatRows(dataset.row_count) : "—"} label="rows" />
              <MetaStat icon={<ColsIcon />} value={isReady ? String(dataset.column_count ?? "—") : "—"} label="cols" />
              <MetaStat icon={<SizeIcon />} value={formatBytes(dataset.file_size)} label="" />
              <MetaStat icon={<TimeIcon />} value={timeAgo(dataset.created_at)} label="" />
              {dataset.original_filename !== dataset.name && (
                <span style={{
                  fontSize: 11,
                  color: "hsl(220 13% 40%)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 200,
                }}
                  title={dataset.original_filename}
                >
                  {dataset.original_filename}
                </span>
              )}
            </div>

            {/* Row 3: column pills */}
            {schema.length > 0 && (
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 5,
                alignItems: "center",
              }}>
                {visibleCols.map((col) => (
                  <ColumnPill key={col.name} col={col} />
                ))}

                {/* +N more pill — clickable */}
                {hasMore && !expanded && (
                  <button
                    onClick={() => setExpanded(true)}
                    className="ds-more-pill"
                    title={`Show ${hiddenCount} more columns`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 9px",
                      borderRadius: 6,
                      border: "1px solid hsl(220 13% 24%)",
                      background: "hsl(220 13% 15%)",
                      color: "hsl(220 13% 58%)",
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 150ms",
                      whiteSpace: "nowrap",
                    }}
                  >
                    +{hiddenCount} more
                    <ChevronDown size={10} />
                  </button>
                )}

                {/* Collapse pill */}
                {expanded && (
                  <button
                    onClick={() => setExpanded(false)}
                    className="ds-more-pill"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 9px",
                      borderRadius: 6,
                      border: "1px solid hsl(220 13% 24%)",
                      background: "hsl(220 13% 15%)",
                      color: "hsl(220 13% 58%)",
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 150ms",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Show less
                    <ChevronUp size={10} />
                  </button>
                )}
              </div>
            )}

            {/* Error message */}
            {dataset.status === "error" && dataset.error_message && (
              <div style={{
                marginTop: 8,
                fontSize: 11,
                color: "hsl(0 72% 60%)",
                background: "hsl(0 72% 51% / 0.08)",
                border: "1px solid hsl(0 72% 51% / 0.18)",
                borderRadius: 7,
                padding: "5px 10px",
              }}>
                {dataset.error_message}
              </div>
            )}
          </div>
        </div>

        {/* ── Expanded columns panel ── */}
        {expanded && schema.length > 0 && (
          <ExpandedColumns schema={schema} />
        )}
      </div>
    </>
  );
}

// ── Meta stat ─────────────────────────────────────────────────────────────────

function MetaStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: 11.5,
      color: "hsl(220 13% 48%)",
    }}>
      <span style={{ opacity: 0.7 }}>{icon}</span>
      <span style={{ color: "hsl(220 13% 65%)", fontWeight: 500 }}>{value}</span>
      {label && <span>{label}</span>}
    </span>
  );
}

// ── Mini icons ────────────────────────────────────────────────────────────────

function RowsIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 3h10M1 6h10M1 9h10" />
    </svg>
  );
}

function ColsIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 1v10M6 1v10M9 1v10" />
    </svg>
  );
}

function SizeIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="10" height="10" rx="2" />
      <path d="M4 6h4M6 4v4" />
    </svg>
  );
}

function TimeIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="5" />
      <path d="M6 3.5V6l2 1.5" />
    </svg>
  );
}

function ChevronDown({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l4 4 4-4" />
    </svg>
  );
}

function ChevronUp({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8l4-4 4 4" />
    </svg>
  );
}
