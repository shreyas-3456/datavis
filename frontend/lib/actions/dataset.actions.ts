"use server";

import { serverRequest } from "@/lib/api/server";
import type { Dataset, DatasetList, DatasetPreview } from "@/lib/api/datasets";

function unwrap<T>({ data, error, status }: { data: T | null; error: string | null; status: number }): T {
  if (error || data === null) {
    throw new Error(error ?? `Request failed with status ${status}`);
  }
  return data;
}

export async function listDatasetsAction(skip = 0, limit = 50): Promise<DatasetList> {
  const res = await serverRequest<DatasetList>({
    method: "GET",
    url: `/datasets/`,
    params: { skip, limit },
  });
  return unwrap(res);
}

export async function getDatasetAction(id: string): Promise<Dataset> {
  const res = await serverRequest<Dataset>({
    method: "GET",
    url: `/datasets/${id}`,
  });
  return unwrap(res);
}

export async function getDatasetPreviewAction(id: string, limit = 100): Promise<DatasetPreview> {
  const res = await serverRequest<DatasetPreview>({
    method: "GET",
    url: `/datasets/${id}/preview`,
    params: { limit },
  });
  return unwrap(res);
}

export async function deleteDatasetAction(id: string): Promise<void> {
  const res = await serverRequest<void>({
    method: "DELETE",
    url: `/datasets/${id}`,
  });
  unwrap(res);
}

export async function uploadDatasetAction(formData: FormData): Promise<Dataset> {
  const res = await serverRequest<Dataset>({
    method: "POST",
    url: `/datasets/`,
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(res);
}