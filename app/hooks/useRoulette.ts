import { useQuery } from "@tanstack/react-query";
import { api, type RouletteState } from "../services/api";

export function useRouletteState() {
  return useQuery<RouletteState>({
    queryKey: ["roulette"],
    queryFn: api.getRouletteState,
    refetchInterval: (query) => {
      return query.state.data?.active ? 300 : 3000;
    },
  });
}
