// frontend/lib/hooks/useDatasets.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteDataset,
  getDataset,
  getDatasetPreview,
  listDatasets,
  uploadDataset,
} from "@/lib/api/datasets";
import type { Dataset } from "@/lib/api/datasets";

// ── Query keys ────────────────────────────────────────────────────────────────

export const datasetKeys = {
  all: ["datasets"] as const,
  list: (skip = 0, limit = 50) => ["datasets", "list", skip, limit] as const,
  detail: (id: string) => ["datasets", "detail", id] as const,
  preview: (id: string, limit = 100) => ["datasets", "preview", id, limit] as const,
};

// ── List ──────────────────────────────────────────────────────────────────────

export function useDatasets(skip = 0, limit = 50) {
  return useQuery({
    queryKey: datasetKeys.list(skip, limit),
    queryFn: () => listDatasets(skip, limit),
  });
}

// ── Single dataset ────────────────────────────────────────────────────────────

export function useDataset(id: string | null) {
  return useQuery({
    queryKey: datasetKeys.detail(id!),
    queryFn: () => getDataset(id!),
    enabled: !!id,
  });
}

// ── Preview ───────────────────────────────────────────────────────────────────

export function useDatasetPreview(id: string | null, limit = 100) {
  return useQuery({
    queryKey: datasetKeys.preview(id!, limit),
    queryFn: () => getDatasetPreview(id!, limit),
    enabled: !!id,
  });
}

// ── Upload ────────────────────────────────────────────────────────────────────

interface UploadVariables {
  file: File;
  name?: string;
  onProgress?: (pct: number) => void;
}

export function useUploadDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, name, onProgress }: UploadVariables) =>
      uploadDataset(file, name, onProgress),
    onSuccess: (newDataset: Dataset) => {
      // Optimistically insert into list cache
      queryClient.setQueryData(
        datasetKeys.list(),
        (old: { items: Dataset[]; total: number } | undefined) => {
          if (!old) return { items: [newDataset], total: 1 };
          return {
            items: [newDataset, ...old.items],
            total: old.total + 1,
          };
        }
      );
      // Prime the detail cache
      queryClient.setQueryData(datasetKeys.detail(newDataset.id), newDataset);
    },
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function useDeleteDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDataset(id),
    onSuccess: (_data, id) => {
      // Remove from list cache
      queryClient.setQueryData(
        datasetKeys.list(),
        (old: { items: Dataset[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            items: old.items.filter((d) => d.id !== id),
            total: old.total - 1,
          };
        }
      );
      queryClient.removeQueries({ queryKey: datasetKeys.detail(id) });
      queryClient.removeQueries({ queryKey: datasetKeys.preview(id) });
    },
  });
}