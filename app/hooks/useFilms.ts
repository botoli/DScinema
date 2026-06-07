import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Film } from "../services/api";

// ---- Query keys ----

export const filmKeys = {
  all: ["films"] as const,
  byName: (engName: string) => ["films", "byName", engName] as const,
  byUser: (userName: string) => ["films", "byUser", userName] as const,
  detail: (id: string) => ["films", id] as const,
};

// ---- Queries ----

interface FilmsQueryOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

export function useAllFilms(options?: FilmsQueryOptions) {
  return useQuery({
    queryKey: filmKeys.all,
    queryFn: api.getFilms,
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
}

export function useFilmsByUser(
  engName: string,
  options?: FilmsQueryOptions,
) {
  return useQuery({
    queryKey: filmKeys.byUser(engName),
    queryFn: () => api.getFilmsByName(engName),
    enabled: (options?.enabled ?? true) && !!engName,
    refetchInterval: options?.refetchInterval,
  });
}

// ---- Mutations ----

export function useAddFilms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (films: Omit<Film, "id">[]) => api.addFilms(films),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filmKeys.all });
    },
  });
}

export function useDeleteFilm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteFilm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filmKeys.all });
    },
  });
}
