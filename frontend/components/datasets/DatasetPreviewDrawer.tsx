"use client";

import { useEffect, useRef, useState } from "react";
import type { Dataset } from "@/lib/api/datasets";
import { useDatasetPreview } from "@/lib/hooks/useDatasets";

const ROW_HEIGHT = 36;
const VISIBLE_ROWS = 15;
const HEADER_HEIGHT = 38;

// ── Dtype badge ───────────────────────────────────────────────────────────────

const DTYPE_META: Record<string, { label: string; color: string }> = {
  integer:  { label: "INT",  color: "hsl(210 100% 60%)" },
  float:    { label: "FLT",  color: "hsl(262 83% 68%)" },
  string:   { label: "STR",  color: "hsl(152 60% 52%)" },
  boolean:  { label: "BOOL", color: "hsl(35 92% 60%)" },
  datetime: { label: "DATE", color: "hsl(198 80% 58%)" },
};

function DtypeBadge({ dtype }: { dtype: string }) {
  const meta = DTYPE_META[dtype] ?? { label: "?", color: "hsl(220 13% 50%)" };
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.06em",
      color: meta.color,
      background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
      borderRadius: 4,
      padding: "2px 5px",
      marginLeft: 6,
      flexShrink: 0,
    }}>
      {meta.label}
    </span>
  );
}

// ── Virtual table ─────────────────────────────────────────────────────────────

interface VirtualTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  schema: Dataset["schema"];
}

function VirtualTable({ columns, rows, schema }: VirtualTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = rows.length * ROW_HEIGHT;
  const containerHeight = VISIBLE_ROWS * ROW_HEIGHT;
  const startIdx = Math.floor(scrollTop / ROW_HEIGHT);
  const endIdx = Math.min(startIdx + VISIBLE_ROWS + 2, rows.length);
  const visibleRows = rows.slice(startIdx, endIdx);
  const offsetY = startIdx * ROW_HEIGHT;

  const schemaMap = Object.fromEntries((schema ?? []).map((c) => [c.name, c]));

  // Column widths — wider for strings, narrower for numbers
  const colWidth = (col: string) => {
    const dtype = schemaMap[col]?.dtype;
    if (dtype === "integer" || dtype === "float" || dtype === "boolean") return 110;
    if (dtype === "datetime") return 160;
    return 180;
  };

  const totalWidth = columns.reduce((s, c) => s + colWidth(c), 0);

  return (
    <div style={{ position: "relative" }}>
      {/* Sticky header */}
      <div style={{
        overflowX: "auto",
        borderBottom: "1px solid hsl(220 13% 20%)",
      }}>
        <div style={{ minWidth: totalWidth, display: "flex", height: HEADER_HEIGHT }}>
          {/* Row number gutter */}
          <div style={gutterHeaderStyle}>#</div>
          {columns.map((col) => (
            <div
              key={col}
              style={{ ...headerCellStyle, width: colWidth(col), minWidth: colWidth(col) }}
              title={col}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {col}
              </span>
              <DtypeBadge dtype={schemaMap[col]?.dtype ?? "string"} />
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable body */}
      <div
        ref={scrollRef}
        onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
        style={{
          height: containerHeight,
          overflowY: "auto",
          overflowX: "auto",
          position: "relative",
        }}
      >
        {/* Total height spacer */}
        <div style={{ height: totalHeight, position: "relative" }}>
          {/* Visible rows */}
          <div style={{ position: "absolute", top: offsetY, left: 0, right: 0 }}>
            {visibleRows.map((row, i) => {
              const absIdx = startIdx + i;
              return (
                <div
                  key={absIdx}
                  style={{
                    display: "flex",
                    height: ROW_HEIGHT,
                    borderBottom: "1px solid hsl(220 13% 16%)",
                    background: absIdx % 2 === 0
                      ? "hsl(220 13% 11%)"
                      : "hsl(220 13% 12%)",
                    minWidth: totalWidth,
                  }}
                >
                  {/* Row number */}
                  <div style={gutterCellStyle}>{absIdx + 1}</div>
                  {columns.map((col) => {
                    const val = row[col];
                    const isNull = val === null || val === undefined;
                    return (
                      <div
                        key={col}
                        style={{
                          ...dataCellStyle,
                          width: colWidth(col),
                          minWidth: colWidth(col),
                          color: isNull
                            ? "hsl(220 13% 35%)"
                            : "hsl(220 13% 82%)",
                          fontStyle: isNull ? "italic" : "normal",
                        }}
                        title={isNull ? "null" : String(val)}
                      >
                        {isNull ? "null" : String(val)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row count footer */}
      <div style={{
        padding: "8px 16px",
        fontSize: 11,
        color: "hsl(220 13% 42%)",
        borderTop: "1px solid hsl(220 13% 18%)",
        display: "flex",
        justifyContent: "space-between",
      }}>
        <span>Showing first {rows.length} rows</span>
        <span>{columns.length} columns</span>
      </div>
    </div>
  );
}

const gutterHeaderStyle: React.CSSProperties = {
  width: 48,
  minWidth: 48,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  color: "hsl(220 13% 38%)",
  borderRight: "1px solid hsl(220 13% 20%)",
  background: "hsl(220 13% 13%)",
  flexShrink: 0,
};

const gutterCellStyle: React.CSSProperties = {
  width: 48,
  minWidth: 48,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  color: "hsl(220 13% 34%)",
  borderRight: "1px solid hsl(220 13% 18%)",
  flexShrink: 0,
  fontVariantNumeric: "tabular-nums",
};

const headerCellStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "0 12px",
  fontSize: 12,
  fontWeight: 600,
  color: "hsl(220 13% 70%)",
  borderRight: "1px solid hsl(220 13% 20%)",
  background: "hsl(220 13% 13%)",
  letterSpacing: "0.01em",
  userSelect: "none",
  flexShrink: 0,
};

const dataCellStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "0 12px",
  fontSize: 12,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  borderRight: "1px solid hsl(220 13% 16%)",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  flexShrink: 0,
};

// ── Stats sidebar ─────────────────────────────────────────────────────────────

function ColumnStats({ dataset }: { dataset: Dataset }) {
  const schema = dataset.schema ?? [];
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      overflowY: "auto",
      maxHeight: VISIBLE_ROWS * ROW_HEIGHT + HEADER_HEIGHT,
    }}>
      {schema.map((col) => (
        <div key={col.name} style={{
          background: "hsl(220 13% 14%)",
          border: "1px solid hsl(220 13% 20%)",
          borderRadius: 10,
          padding: "10px 12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
              background: DTYPE_META[col.dtype]?.color ?? "hsl(220 13% 50%)",
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(220 13% 85%)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {col.name}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {col.missing_pct > 0 && (
              <StatRow label="Missing" value={`${col.missing_pct.toFixed(1)}%`} warn />
            )}
            {col.min !== null && col.min !== undefined && (
              <StatRow label="Min" value={String(col.min)} />
            )}
            {col.max !== null && col.max !== undefined && (
              <StatRow label="Max" value={String(col.max)} />
            )}
            {col.mean !== null && col.mean !== undefined && (
              <StatRow label="Mean" value={String(col.mean)} />
            )}
            {col.unique_count !== null && col.unique_count !== undefined && (
              <StatRow label="Unique" value={String(col.unique_count)} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 11, color: "hsl(220 13% 45%)" }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 500, color: warn ? "hsl(35 92% 60%)" : "hsl(220 13% 72%)" }}>
        {value}
      </span>
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

interface PreviewDrawerProps {
  dataset: Dataset | null;
  onClose: () => void;
}

export function DatasetPreviewDrawer({ dataset, onClose }: PreviewDrawerProps) {
  const [tab, setTab] = useState<"data" | "stats">("data");
  const { data: preview, isLoading, isError } = useDatasetPreview(dataset?.id ?? null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    if (dataset) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [dataset]);

  const open = !!dataset;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "hsl(220 13% 4% / 0.7)",
          backdropFilter: "blur(4px)",
          zIndex: 40,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 250ms",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed",
        top: 0, right: 0, bottom: 0,
        width: "min(90vw, 1100px)",
        background: "hsl(220 13% 10%)",
        borderLeft: "1px solid hsl(220 13% 20%)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 300ms cubic-bezier(0.32, 0, 0.15, 1)",
        boxShadow: "-24px 0 80px hsl(220 13% 4% / 0.5)",
      }}>
        {/* Drawer header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid hsl(220 13% 18%)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "hsl(220 13% 92%)", letterSpacing: "-0.01em" }}>
              {dataset?.name}
            </span>
            <span style={{ fontSize: 12, color: "hsl(220 13% 48%)" }}>
              {dataset?.original_filename} &middot; {dataset?.row_count?.toLocaleString()} rows &middot; {dataset?.column_count} columns
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Tabs */}
            <div style={{
              display: "flex",
              background: "hsl(220 13% 15%)",
              borderRadius: 8,
              padding: 3,
              gap: 2,
            }}>
              {(["data", "stats"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "5px 14px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    background: tab === t ? "hsl(220 13% 22%)" : "transparent",
                    color: tab === t ? "hsl(220 13% 88%)" : "hsl(220 13% 48%)",
                    transition: "background 150ms, color 150ms",
                  }}
                >
                  {t === "data" ? "Data" : "Column stats"}
                </button>
              ))}
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32,
                borderRadius: 8,
                border: "1px solid hsl(220 13% 24%)",
                background: "transparent",
                color: "hsl(220 13% 55%)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16,
                transition: "background 150ms, color 150ms",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "hsl(220 13% 18%)";
                (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 13% 80%)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 13% 55%)";
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Drawer body */}
        <div style={{ flex: 1, overflow: "hidden", padding: "20px 24px" }}>
          {isLoading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "hsl(220 13% 45%)", fontSize: 13 }}>
              Loading preview…
            </div>
          )}

          {isError && (
            <div style={{ color: "hsl(0 72% 60%)", fontSize: 13, padding: 16 }}>
              Failed to load preview.
            </div>
          )}

          {preview && tab === "data" && (
            <div style={{
              border: "1px solid hsl(220 13% 20%)",
              borderRadius: 12,
              overflow: "hidden",
              background: "hsl(220 13% 11%)",
            }}>
              <VirtualTable
                columns={preview.columns}
                rows={preview.rows as Record<string, unknown>[]}
                schema={dataset?.schema ?? null}
              />
            </div>
          )}

          {dataset && tab === "stats" && (
            <ColumnStats dataset={dataset} />
          )}
        </div>
      </div>
    </>
  );
}
