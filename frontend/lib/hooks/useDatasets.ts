import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  putToS3
} from "@/lib/api/datasets";
import {
  listDatasetsAction,
  getDatasetAction,
  getDatasetPreviewAction,
  deleteDatasetAction,
  presignUploadAction,
  confirmUploadAction,
} from "@/lib/actions/dataset.actions";
import type { Dataset } from "@/lib/api/datasets";

export const datasetKeys = {
  all: ["datasets"] as const,
  list: (skip = 0, limit = 50) => ["datasets", "list", skip, limit] as const,
  detail: (id: string) => ["datasets", "detail", id] as const,
  preview: (id: string, limit = 100) => ["datasets", "preview", id, limit] as const,
};

export function useDatasets(skip = 0, limit = 50) {
  return useQuery({
    queryKey: datasetKeys.list(skip, limit),
    queryFn: () => listDatasetsAction(skip, limit),
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasProcessing = data?.items.some(
        (d) => d.status === "processing" || d.status === "pending",
      );
      return hasProcessing ? 3000 : false;
    },
  });
}

export function useDataset(id: string | null) {
  return useQuery({
    queryKey: datasetKeys.detail(id!),
    queryFn: () => getDatasetAction(id!),
    enabled: !!id,
  });
}

export function useDatasetPreview(id: string | null, limit = 100) {
  return useQuery({
    queryKey: datasetKeys.preview(id!, limit),
    queryFn: () => getDatasetPreviewAction(id!, limit),
    enabled: !!id,
  });
}

interface UploadVariables {
  file: File;
  name?: string;
  onProgress?: (pct: number) => void;
}

export function useUploadDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, name, onProgress }: UploadVariables) => {
      // Step 1 — presign: creates pending DB record, returns S3 PUT URL
      onProgress?.(5);
      const { upload_url, dataset_id , content_type } = await presignUploadAction(
        file.name,
        file.size,
        name,
      );

      // Step 2 — PUT directly to S3 via axios (real upload progress)
      onProgress?.(10);
      await putToS3(upload_url, file, content_type, onProgress);

      // Step 3 — confirm: flips status to processing, enqueues Celery job
      console.log("calling confirm with dataset_id:", dataset_id);
      const dataset = await confirmUploadAction(dataset_id);
      console.log("confirm response:", dataset);
      onProgress?.(100);
      return dataset;  // also remove the duplicate return
    },
    onSuccess: (newDataset: Dataset) => {
      queryClient.setQueryData(
        datasetKeys.list(),
        (old: { items: Dataset[]; total: number } | undefined) => {
          if (!old) return { items: [newDataset], total: 1 };
          return { items: [newDataset, ...old.items], total: old.total + 1 };
        },
      );
      queryClient.setQueryData(datasetKeys.detail(newDataset.id), newDataset);
    },
  });
}

export function useDeleteDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDatasetAction(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData(
        datasetKeys.list(),
        (old: { items: Dataset[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            items: old.items.filter((d) => d.id !== id),
            total: old.total - 1,
          };
        },
      );
      queryClient.removeQueries({ queryKey: datasetKeys.detail(id) });
      queryClient.removeQueries({ queryKey: datasetKeys.preview(id) });
    },
  });
}