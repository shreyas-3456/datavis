"use client";

import { useCallback, useRef, useState } from "react";
import { useUploadDataset } from "@/lib/hooks/useDatasets";

// ── Types ─────────────────────────────────────────────────────────────────────

type UploadState =
  | { phase: "idle" }
  | { phase: "dragging" }
  | { phase: "uploading"; file: File; progress: number }
  | { phase: "success"; filename: string }
  | { phase: "error"; message: string };

const ACCEPTED = [".csv", ".xlsx", ".xls", ".json"];
const ACCEPTED_MIME = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/json",
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return "CSV";
  if (ext === "json") return "JSON";
  if (ext === "xlsx" || ext === "xls") return "XLS";
  return "FILE";
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DropzoneProps {
  onUploaded?: () => void;
}

export function DatasetDropzone({ onUploaded }: DropzoneProps) {
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: upload } = useUploadDataset();

  const processFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_MIME.includes(file.type) && !ACCEPTED.some((ext) => file.name.endsWith(ext))) {
        setState({ phase: "error", message: "Only CSV, Excel, and JSON files are supported." });
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        setState({ phase: "error", message: "File must be under 100 MB." });
        return;
      }

      setState({ phase: "uploading", file, progress: 0 });

      try {
        await upload({
          file,
          onProgress: (pct) =>
            setState((prev) =>
              prev.phase === "uploading" ? { ...prev, progress: pct } : prev
            ),
        });
        setState({ phase: "success", filename: file.name });
        onUploaded?.();
        setTimeout(() => setState({ phase: "idle" }), 3000);
      } catch (err: unknown) {
        setState({
          phase: "error",
          message: err instanceof Error ? err.message : "Upload failed.",
        });
      }
    },
    [upload, onUploaded]
  );

  // ── Drag handlers ───────────────────────────────────────────────────────────

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setState((prev) => (prev.phase === "idle" ? { phase: "dragging" } : prev));
  };

  const onDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setState((prev) => (prev.phase === "dragging" ? { phase: "idle" } : prev));
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const reset = () => setState({ phase: "idle" });

  // ── Render ──────────────────────────────────────────────────────────────────

  const isDragging = state.phase === "dragging";
  const isUploading = state.phase === "uploading";
  const isSuccess = state.phase === "success";
  const isError = state.phase === "error";

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => state.phase === "idle" && inputRef.current?.click()}
      className={[
        "dropzone",
        isDragging && "dropzone--dragging",
        isUploading && "dropzone--uploading",
        isSuccess && "dropzone--success",
        isError && "dropzone--error",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        onChange={onFileChange}
        style={{ display: "none" }}
      />

      {/* ── Idle / Dragging ── */}
      {(state.phase === "idle" || state.phase === "dragging") && (
        <div className="dropzone__idle">
          <div className="dropzone__icon-ring">
            <UploadIcon dragging={isDragging} />
          </div>
          <p className="dropzone__headline">
            {isDragging ? "Release to upload" : "Drop your file here"}
          </p>
          <p className="dropzone__sub">
            CSV, Excel, JSON &mdash; up to 100 MB
          </p>
          <button
            className="dropzone__btn"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Browse files
          </button>
        </div>
      )}

      {/* ── Uploading ── */}
      {state.phase === "uploading" && (
        <div className="dropzone__upload">
          <div className="dropzone__file-badge">
            <span className="dropzone__file-tag">{fileIcon(state.file.name)}</span>
            <div className="dropzone__file-info">
              <span className="dropzone__file-name">{state.file.name}</span>
              <span className="dropzone__file-size">{formatBytes(state.file.size)}</span>
            </div>
          </div>

          <div className="dropzone__progress-track">
            <div
              className="dropzone__progress-fill"
              style={{ width: `${state.progress}%` }}
            />
          </div>

          <p className="dropzone__progress-label">
            {state.progress < 100 ? `Uploading… ${state.progress}%` : "Processing…"}
          </p>
        </div>
      )}

      {/* ── Success ── */}
      {state.phase === "success" && (
        <div className="dropzone__success">
          <CheckIcon />
          <p className="dropzone__headline">Upload complete</p>
          <p className="dropzone__sub">{state.filename}</p>
        </div>
      )}

      {/* ── Error ── */}
      {state.phase === "error" && (
        <div className="dropzone__error">
          <ErrorIcon />
          <p className="dropzone__headline">Upload failed</p>
          <p className="dropzone__sub">{state.message}</p>
          <button className="dropzone__btn dropzone__btn--ghost" onClick={reset}>
            Try again
          </button>
        </div>
      )}

      <style>{`
        .dropzone {
          position: relative;
          border: 1.5px dashed hsl(220 13% 28%);
          border-radius: 16px;
          background: hsl(220 13% 11%);
          padding: 48px 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color 200ms, background 200ms, box-shadow 200ms;
          min-height: 260px;
          overflow: hidden;
        }
        .dropzone::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(ellipse 60% 50% at 50% 100%,
            hsl(210 100% 56% / 0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .dropzone--dragging {
          border-color: hsl(210 100% 60%);
          background: hsl(220 13% 13%);
          box-shadow: 0 0 0 4px hsl(210 100% 56% / 0.12),
                      inset 0 0 40px hsl(210 100% 56% / 0.04);
          cursor: copy;
        }
        .dropzone--success {
          border-color: hsl(152 69% 45%);
          border-style: solid;
          cursor: default;
        }
        .dropzone--error {
          border-color: hsl(0 72% 51%);
          border-style: solid;
          cursor: default;
        }
        .dropzone--uploading {
          cursor: default;
          pointer-events: none;
        }

        /* ── inner layouts ── */
        .dropzone__idle,
        .dropzone__upload,
        .dropzone__success,
        .dropzone__error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
          width: 100%;
          max-width: 360px;
        }

        /* ── icon ring ── */
        .dropzone__icon-ring {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 1.5px solid hsl(220 13% 28%);
          background: hsl(220 13% 15%);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 200ms, background 200ms;
          margin-bottom: 4px;
        }
        .dropzone--dragging .dropzone__icon-ring {
          border-color: hsl(210 100% 60%);
          background: hsl(210 100% 56% / 0.1);
        }

        /* ── typography ── */
        .dropzone__headline {
          font-size: 15px;
          font-weight: 600;
          color: hsl(220 13% 91%);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .dropzone__sub {
          font-size: 13px;
          color: hsl(220 13% 55%);
          margin: 0;
        }

        /* ── button ── */
        .dropzone__btn {
          margin-top: 4px;
          padding: 7px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          background: hsl(210 100% 56%);
          color: #fff;
          border: none;
          cursor: pointer;
          transition: background 150ms, transform 100ms;
        }
        .dropzone__btn:hover { background: hsl(210 100% 62%); }
        .dropzone__btn:active { transform: scale(0.97); }
        .dropzone__btn--ghost {
          background: transparent;
          border: 1.5px solid hsl(220 13% 32%);
          color: hsl(220 13% 70%);
        }
        .dropzone__btn--ghost:hover {
          background: hsl(220 13% 18%);
          border-color: hsl(220 13% 40%);
        }

        /* ── file badge ── */
        .dropzone__file-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          background: hsl(220 13% 16%);
          border: 1px solid hsl(220 13% 24%);
          border-radius: 10px;
          padding: 10px 14px;
          width: 100%;
        }
        .dropzone__file-tag {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: hsl(210 100% 65%);
          background: hsl(210 100% 56% / 0.12);
          border-radius: 4px;
          padding: 3px 6px;
          flex-shrink: 0;
        }
        .dropzone__file-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          overflow: hidden;
        }
        .dropzone__file-name {
          font-size: 13px;
          font-weight: 500;
          color: hsl(220 13% 88%);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 240px;
        }
        .dropzone__file-size {
          font-size: 11px;
          color: hsl(220 13% 50%);
        }

        /* ── progress bar ── */
        .dropzone__progress-track {
          width: 100%;
          height: 4px;
          border-radius: 99px;
          background: hsl(220 13% 20%);
          overflow: hidden;
          margin-top: 4px;
        }
        .dropzone__progress-fill {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, hsl(210 100% 50%), hsl(210 100% 68%));
          transition: width 200ms ease;
        }
        .dropzone__progress-label {
          font-size: 12px;
          color: hsl(220 13% 55%);
          margin: 0;
        }

        /* ── success / error icons ── */
        .dropzone__success svg,
        .dropzone__error svg {
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}

// ── Icons (inline SVG, zero deps) ─────────────────────────────────────────────

function UploadIcon({ dragging }: { dragging: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke={dragging ? "hsl(210 100% 65%)" : "hsl(220 13% 55%)"}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transition: "stroke 200ms" }}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="hsl(152 69% 45% / 0.12)" />
      <circle cx="20" cy="20" r="14" stroke="hsl(152 69% 45%)" strokeWidth="1.5" fill="none" />
      <polyline
        points="14,20 18,24 26,16"
        stroke="hsl(152 69% 55%)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="hsl(0 72% 51% / 0.1)" />
      <circle cx="20" cy="20" r="14" stroke="hsl(0 72% 51%)" strokeWidth="1.5" fill="none" />
      <line x1="15" y1="15" x2="25" y2="25" stroke="hsl(0 72% 60%)" strokeWidth="2" strokeLinecap="round" />
      <line x1="25" y1="15" x2="15" y2="25" stroke="hsl(0 72% 60%)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
