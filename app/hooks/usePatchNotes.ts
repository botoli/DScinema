import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

export const patchNoteKeys = {
  all: ["patchNotes"] as const,
};

export function usePatchNotes() {
  return useQuery({
    queryKey: patchNoteKeys.all,
    queryFn: api.getPatchNotes,
    staleTime: 5 * 60 * 1000, // patch notes rarely change
  });
}
