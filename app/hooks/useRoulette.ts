import { useQuery } from "@tanstack/react-query";
import { api, type RouletteState } from "../services/api";

const ROULETTE_SYNC_INTERVAL = 300;

export function useRouletteState() {
  return useQuery<RouletteState>({
    queryKey: ["roulette"],
    queryFn: api.getRouletteState,
    // Частый опрос нужен и до старта: иначе участник узнаёт о запуске
    // с задержкой до трёх секунд и видит только конец анимации.
    refetchInterval: ROULETTE_SYNC_INTERVAL,
  });
}
