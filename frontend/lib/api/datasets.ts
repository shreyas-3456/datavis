import {
  listDatasetsAction,
  getDatasetAction,
  getDatasetPreviewAction,
  deleteDatasetAction,
  uploadDatasetAction,
} from "@/lib/actions/dataset.actions";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DatasetStatus = "pending" | "processing" | "ready" | "error";

export type ColumnDtype = "integer" | "float" | "string" | "boolean" | "datetime";

export interface ColumnSchema {
  name: string;
  dtype: ColumnDtype;
  nullable: boolean;
  missing_count: number;
  missing_pct: number;
  sample_values: unknown[];
  min?: number | null;
  max?: number | null;
  mean?: number | null;
  std?: number | null;
  unique_count?: number | null;
  top_values?: unknown[] | null;
}

export interface DatasetStats {
  total_missing: number;
  missing_pct: number;
  outlier_columns: Record<
    string,
    { count: number; pct: number; lower_fence: number; upper_fence: number }
  >;
  duplicate_rows: number;
}

export interface Dataset {
  id: string;
  user_id: string;
  name: string;
  original_filename: string;
  file_type: string;
  file_size: number | null;
  status: DatasetStatus;
  error_message: string | null;
  row_count: number | null;
  column_count: number | null;
  schema: ColumnSchema[] | null;
  stats: DatasetStats | null;
  created_at: string;
  updated_at: string;
}

export interface DatasetList {
  items: Dataset[];
  total: number;
}

export interface DatasetPreview {
  columns: string[];
  rows: Record<string, unknown>[];
  total_rows: number;
  preview_rows: number;
}

// ── API calls (via server actions — no direct FastAPI calls from browser) ─────

export async function uploadDataset(
  file: File,
  name?: string,
  onProgress?: (pct: number) => void
): Promise<Dataset> {
  // Progress can't be tracked through server actions (no streaming).
  // We simulate it: jump to 50% immediately, then 100% on resolve.
  onProgress?.(50);
  const formData = new FormData();
  formData.append("file", file);
  if (name) formData.append("name", name);
  const result = await uploadDatasetAction(formData);
  onProgress?.(100);
  return result;
}

export async function listDatasets(skip = 0, limit = 50): Promise<DatasetList> {
  return listDatasetsAction(skip, limit);
}

export async function getDataset(id: string): Promise<Dataset> {
  return getDatasetAction(id);
}

export async function getDatasetPreview(
  id: string,
  limit = 100
): Promise<DatasetPreview> {
  return getDatasetPreviewAction(id, limit);
}

export async function deleteDataset(id: string): Promise<void> {
  return deleteDatasetAction(id);
}