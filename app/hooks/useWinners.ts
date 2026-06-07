import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Film } from "../services/api";

export const winnerKeys = {
  all: ["winners"] as const,
};

export function useWinners() {
  return useQuery({
    queryKey: winnerKeys.all,
    queryFn: api.getWinners,
  });
}

export function useAddWinner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (film: Film) => api.addWinner(film),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: winnerKeys.all });
    },
  });
}
