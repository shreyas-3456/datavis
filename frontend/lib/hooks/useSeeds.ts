import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listSeedsAction, linkSeedAction } from "@/lib/actions/seed.actions";
import { datasetKeys } from "@/lib/hooks/useDatasets";

export const seedKeys = {
  all: ["seeds"] as const,
};

export function useSeeds() {
  return useQuery({
    queryKey: seedKeys.all,
    queryFn: listSeedsAction,
    staleTime: 1000 * 60 * 10, // catalogue rarely changes
  });
}

export function useLinkSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (seed_key: string) => linkSeedAction(seed_key),
    onSuccess: () => {
      // Refresh the user's dataset list so the new entry appears immediately
      qc.invalidateQueries({ queryKey: datasetKeys.list() });
    },
  });
}