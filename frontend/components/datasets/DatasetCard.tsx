"use client";

import { useState } from "react";
import type { Dataset } from "@/lib/api/datasets";
import { useDeleteDataset } from "@/lib/hooks/useDatasets";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRows(n: number | null) {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M rows`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K rows`;
  return `${n} rows`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const DTYPE_COLOR: Record<string, string> = {
  integer: "hsl(210 100% 60%)",
  float:   "hsl(262 83% 68%)",
  string:  "hsl(152 60% 52%)",
  boolean: "hsl(35 92% 60%)",
  datetime:"hsl(198 80% 58%)",
};

const FILE_TYPE_LABEL: Record<string, string> = {
  csv: "CSV", excel: "XLS", json: "JSON",
};

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Dataset["status"] }) {
  const map = {
    ready:      { label: "Ready",      color: "hsl(152 60% 45%)", bg: "hsl(152 60% 45% / 0.1)"  },
    processing: { label: "Processing", color: "hsl(35 92% 55%)",  bg: "hsl(35 92% 55% / 0.1)"   },
    pending:    { label: "Pending",    color: "hsl(220 13% 55%)", bg: "hsl(220 13% 55% / 0.1)"  },
    error:      { label: "Error",      color: "hsl(0 72% 55%)",   bg: "hsl(0 72% 55% / 0.1)"    },
  } as const;

  const s = map[status] ?? map.pending;

  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      color: s.color,
      background: s.bg,
      borderRadius: 6,
      padding: "3px 8px",
    }}>
      {status === "processing" && (
        <span style={{ marginRight: 5, display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
      )}
      {s.label}
    </span>
  );
}

// ── Schema pill strip ─────────────────────────────────────────────────────────

function SchemaPills({ schema }: { schema: Dataset["schema"] }) {
  if (!schema || schema.length === 0) return null;
  const visible = schema.slice(0, 6);
  const overflow = schema.length - visible.length;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
      {visible.map((col) => (
        <span
          key={col.name}
          title={`${col.name} · ${col.dtype}${col.nullable ? " · nullable" : ""}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: "hsl(220 13% 70%)",
            background: "hsl(220 13% 16%)",
            border: "1px solid hsl(220 13% 22%)",
            borderRadius: 6,
            padding: "3px 8px",
            cursor: "default",
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: DTYPE_COLOR[col.dtype] ?? "hsl(220 13% 50%)",
          }} />
          {col.name}
        </span>
      ))}
      {overflow > 0 && (
        <span style={{
          fontSize: 11,
          color: "hsl(220 13% 45%)",
          padding: "3px 8px",
          alignSelf: "center",
        }}>
          +{overflow} more
        </span>
      )}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

interface DatasetCardProps {
  dataset: Dataset;
  onPreview: (dataset: Dataset) => void;
}

export function DatasetCard({ dataset, onPreview }: DatasetCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { mutate: deleteDataset, isPending: isDeleting } = useDeleteDataset();

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    deleteDataset(dataset.id);
  };

  const missingPct = dataset.stats?.missing_pct ?? 0;
  const outlierCount = Object.keys(dataset.stats?.outlier_columns ?? {}).length;

  return (
    <div className="ds-card">
      {/* ── Header ── */}
      <div className="ds-card__header">
        <div className="ds-card__title-row">
          <span className="ds-card__file-type">
            {FILE_TYPE_LABEL[dataset.file_type] ?? dataset.file_type.toUpperCase()}
          </span>
          <h3 className="ds-card__name" title={dataset.name}>{dataset.name}</h3>
        </div>
        <StatusBadge status={dataset.status} />
      </div>

      {/* ── Meta strip ── */}
      <div className="ds-card__meta">
        <MetaItem label="Rows" value={formatRows(dataset.row_count)} />
        <MetaDivider />
        <MetaItem label="Columns" value={dataset.column_count?.toString() ?? "—"} />
        <MetaDivider />
        <MetaItem label="Size" value={formatBytes(dataset.file_size)} />
        <MetaDivider />
        <MetaItem label="Added" value={timeAgo(dataset.created_at)} />
      </div>

      {/* ── Quality indicators ── */}
      {dataset.status === "ready" && (
        <div className="ds-card__quality">
          <QualityBar label="Missing" pct={missingPct} color="hsl(35 92% 55%)" />
          {outlierCount > 0 && (
            <span className="ds-card__outlier-tag">
              {outlierCount} outlier col{outlierCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* ── Error message ── */}
      {dataset.status === "error" && dataset.error_message && (
        <p className="ds-card__error-msg">{dataset.error_message}</p>
      )}

      {/* ── Schema pills ── */}
      <SchemaPills schema={dataset.schema} />

      {/* ── Actions ── */}
      <div className="ds-card__actions">
        {dataset.status === "ready" && (
          <button
            className="ds-card__action ds-card__action--primary"
            onClick={() => onPreview(dataset)}
          >
            Preview data
          </button>
        )}
        <button
          className={[
            "ds-card__action",
            confirmDelete ? "ds-card__action--confirm" : "ds-card__action--ghost",
          ].join(" ")}
          onClick={handleDelete}
          disabled={isDeleting}
          onBlur={() => setConfirmDelete(false)}
        >
          {isDeleting ? "Deleting…" : confirmDelete ? "Confirm delete" : "Delete"}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .ds-card {
          background: hsl(220 13% 12%);
          border: 1px solid hsl(220 13% 20%);
          border-radius: 14px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 0;
          transition: border-color 180ms, box-shadow 180ms;
        }
        .ds-card:hover {
          border-color: hsl(220 13% 28%);
          box-shadow: 0 4px 24px hsl(220 13% 4% / 0.4);
        }

        /* header */
        .ds-card__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .ds-card__title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .ds-card__file-type {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: hsl(210 100% 65%);
          background: hsl(210 100% 56% / 0.1);
          border-radius: 4px;
          padding: 2px 6px;
          flex-shrink: 0;
        }
        .ds-card__name {
          font-size: 14px;
          font-weight: 600;
          color: hsl(220 13% 92%);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: -0.01em;
        }

        /* meta */
        .ds-card__meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .ds-card__meta-item { display: flex; flex-direction: column; gap: 1px; }
        .ds-card__meta-label {
          font-size: 10px;
          color: hsl(220 13% 42%);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .ds-card__meta-value {
          font-size: 13px;
          font-weight: 500;
          color: hsl(220 13% 78%);
        }
        .ds-card__meta-divider {
          width: 1px;
          height: 24px;
          background: hsl(220 13% 22%);
          flex-shrink: 0;
        }

        /* quality */
        .ds-card__quality {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .ds-card__quality-bar { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 120px; }
        .ds-card__quality-label { font-size: 11px; color: hsl(220 13% 48%); white-space: nowrap; }
        .ds-card__quality-track {
          flex: 1;
          height: 3px;
          border-radius: 99px;
          background: hsl(220 13% 20%);
          overflow: hidden;
        }
        .ds-card__quality-fill { height: 100%; border-radius: 99px; }
        .ds-card__quality-pct { font-size: 11px; color: hsl(220 13% 55%); white-space: nowrap; }
        .ds-card__outlier-tag {
          font-size: 11px;
          color: hsl(262 83% 72%);
          background: hsl(262 83% 68% / 0.1);
          border-radius: 5px;
          padding: 2px 8px;
          white-space: nowrap;
        }

        /* error */
        .ds-card__error-msg {
          font-size: 12px;
          color: hsl(0 72% 60%);
          background: hsl(0 72% 51% / 0.08);
          border-radius: 7px;
          padding: 8px 10px;
          margin: 0 0 10px;
        }

        /* actions */
        .ds-card__actions {
          display: flex;
          gap: 8px;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid hsl(220 13% 18%);
        }
        .ds-card__action {
          font-size: 12px;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 7px;
          border: none;
          cursor: pointer;
          transition: background 150ms, color 150ms, transform 80ms;
        }
        .ds-card__action:active { transform: scale(0.97); }
        .ds-card__action:disabled { opacity: 0.5; cursor: not-allowed; }
        .ds-card__action--primary {
          background: hsl(210 100% 56%);
          color: #fff;
        }
        .ds-card__action--primary:hover { background: hsl(210 100% 62%); }
        .ds-card__action--ghost {
          background: transparent;
          color: hsl(220 13% 48%);
          border: 1px solid hsl(220 13% 24%);
        }
        .ds-card__action--ghost:hover {
          background: hsl(220 13% 17%);
          color: hsl(220 13% 65%);
        }
        .ds-card__action--confirm {
          background: hsl(0 72% 51% / 0.12);
          color: hsl(0 72% 60%);
          border: 1px solid hsl(0 72% 51% / 0.3);
        }
        .ds-card__action--confirm:hover { background: hsl(0 72% 51% / 0.2); }
      `}</style>
    </div>
  );
}

// ── Small sub-components ──────────────────────────────────────────────────────

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="ds-card__meta-item">
      <span className="ds-card__meta-label">{label}</span>
      <span className="ds-card__meta-value">{value}</span>
    </div>
  );
}

function MetaDivider() {
  return <div className="ds-card__meta-divider" />;
}

function QualityBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="ds-card__quality-bar">
      <span className="ds-card__quality-label">{label}</span>
      <div className="ds-card__quality-track">
        <div
          className="ds-card__quality-fill"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
      <span className="ds-card__quality-pct">{pct.toFixed(1)}%</span>
    </div>
  );
}
