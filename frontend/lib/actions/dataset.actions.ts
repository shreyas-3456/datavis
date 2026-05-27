"use server";

import { serverRequest } from "@/lib/api/server";
import type { Dataset, DatasetList, DatasetPreview, PresignResponse } from "@/lib/api/datasets";

function unwrap<T>({ data, error, status }: { data: T | null; error: string | null; status: number }): T {
  if (error || data === null) {
    throw new Error(error ?? `Request failed with status ${status}`);
  }
  return data;
}

export async function listDatasetsAction(skip = 0, limit = 50): Promise<DatasetList> {
  return unwrap(await serverRequest<DatasetList>({
    method: "GET",
    url: `/datasets/`,
    params: { skip, limit },
  }));
}

export async function getDatasetAction(id: string): Promise<Dataset> {
  return unwrap(await serverRequest<Dataset>({
    method: "GET",
    url: `/datasets/${id}`,
  }));
}

export async function getDatasetPreviewAction(id: string, limit = 100): Promise<DatasetPreview> {
  return unwrap(await serverRequest<DatasetPreview>({
    method: "GET",
    url: `/datasets/${id}/preview`,
    params: { limit },
  }));
}

export async function deleteDatasetAction(id: string): Promise<void> {
  unwrap(await serverRequest<void>({
    method: "DELETE",
    url: `/datasets/${id}`,
  }));
}

export async function presignUploadAction(
  filename: string,
  fileSize: number,
  name?: string,
): Promise<PresignResponse> {
  return unwrap(await serverRequest<PresignResponse>({
    method: "POST",
    url: `/datasets/presign`,
    data: { filename, file_size: fileSize, name },
  }));
}

export async function confirmUploadAction(datasetId: string): Promise<Dataset> {
  return unwrap(await serverRequest<Dataset>({
    method: "POST",
    url: `/datasets/confirm`,
    data: { dataset_id: datasetId },
  }));
}