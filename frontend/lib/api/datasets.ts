import axios from "axios";

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

export interface PresignResponse {
  dataset_id: string;
  upload_url: string;
  s3_key: string;
  expires_in: number;
  content_type: string;
}

// ── S3 PUT (pure client-side, called from the hook) ───────────────────────────
export async function putToS3(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  await axios.put(uploadUrl, file, {
    headers: {
      "Content-Type": contentType,
    },
    onUploadProgress: (e) => {
      if (e.total) {
        onProgress?.(10 + Math.round((e.loaded / e.total) * 80));
      }
    },
  });
}