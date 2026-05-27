// lib/actions/seed.actions.ts
"use server";

import { serverRequest } from "@/lib/api/server";

export interface SeedDataset {
  seed_key: string;
  name: string;
  description: string | null;
  source: string | null;
  source_url: string | null;
  domain: string | null;
  duckdb_table: string;
  row_count: number | null;
  column_count: number | null;
  file_size_mb: number | null;
  schema: Record<string, any>[] | null;
  stats: Record<string, any> | null;
}

export interface LinkResponse {
  dataset_id: string;
  duckdb_table: string;
  name: string;
  row_count: number | null;
  column_count: number | null;
}

function unwrap<T>({ data, error, status }: { data: T | null; error: string | null; status: number }): T {
  if (error || data === null) throw new Error(error ?? `Request failed with status ${status}`);
  return data;
}

export async function listSeedsAction(): Promise<SeedDataset[]> {
  return unwrap(await serverRequest<SeedDataset[]>({ method: "GET", url: "/seeds/" }));
}

export async function linkSeedAction(seed_key: string): Promise<LinkResponse> {
  return unwrap(
    await serverRequest<LinkResponse>({
      method: "POST",
      url: `/seeds/${seed_key}/link`,
    })
  );
}