import { kv } from "./kv";
import type { Film } from "../services/api";

export interface RouletteStateData {
  active: boolean;
  eliminatedIds: string[];
  winner: Film | null;
  filmIds: string[];
  wonAt?: number;
}

const ROULETTE_KEY = "roulette";

export async function getRouletteState(): Promise<RouletteStateData | null> {
  return kv.get<RouletteStateData>(ROULETTE_KEY);
}

export async function startRoulette(filmIds: string[]): Promise<void> {
  await kv.set(ROULETTE_KEY, {
    active: true,
    eliminatedIds: [],
    winner: null,
    filmIds,
    wonAt: undefined,
  });
}

export async function eliminateFilm(filmId: string): Promise<void> {
  const state = await getRouletteState();
  if (!state?.active) return;
  if (state.eliminatedIds.includes(filmId)) return;
  state.eliminatedIds.push(filmId);
  await kv.set(ROULETTE_KEY, state);
}

export async function finishRoulette(winner: Film, wonAt?: number): Promise<void> {
  await kv.set(ROULETTE_KEY, {
    active: false,
    eliminatedIds: [],
    winner,
    filmIds: [],
    wonAt: wonAt ?? Date.now(),
  });
}

export async function resetRoulette(): Promise<void> {
  await kv.del(ROULETTE_KEY);
}
