import { kv } from "./kv";
import type { Film } from "../services/api";
import { createRouletteScenario } from "./roulette-random";

export interface RouletteStateData {
  active: boolean;
  eliminatedIds: string[];
  winner: Film | null;
  filmIds: string[];
  reelFilmIds: string[];
  winnerId?: string;
  targetPosition?: number;
  startedAt?: number;
  duration?: number;
  wonAt?: number;
}

const ROULETTE_KEY = "roulette";
export const ROULETTE_DURATION = 5200;

export const emptyRouletteState = (): RouletteStateData => ({
  active: false,
  eliminatedIds: [],
  winner: null,
  filmIds: [],
  reelFilmIds: [],
});

export async function getRouletteState(): Promise<RouletteStateData | null> {
  return kv.get<RouletteStateData>(ROULETTE_KEY);
}

export async function startRoulette(filmIds: string[]): Promise<RouletteStateData> {
  if (filmIds.length < 2) throw new Error("At least two films are required");

  const { winnerId, targetPosition, reelFilmIds } = createRouletteScenario(filmIds);
  const state: RouletteStateData = {
    active: true,
    eliminatedIds: [],
    winner: null,
    filmIds,
    reelFilmIds,
    winnerId,
    targetPosition,
    startedAt: Date.now(),
    duration: ROULETTE_DURATION,
    wonAt: undefined,
  };
  await kv.set(ROULETTE_KEY, state);
  return state;
}

export async function eliminateFilm(filmId: string): Promise<void> {
  const state = await getRouletteState();
  if (!state?.active) return;
  if (state.eliminatedIds.includes(filmId)) return;
  state.eliminatedIds.push(filmId);
  await kv.set(ROULETTE_KEY, state);
}

export async function finishRoulette(winner: Film): Promise<RouletteStateData> {
  const current = await getRouletteState();
  if (current?.winnerId && current.winnerId !== winner.id) {
    throw new Error("Winner does not match the active roulette scenario");
  }
  const state: RouletteStateData = {
    active: false,
    eliminatedIds: [],
    winner,
    filmIds: [],
    reelFilmIds: current?.reelFilmIds ?? [],
    winnerId: current?.winnerId ?? winner.id,
    targetPosition: current?.targetPosition,
    startedAt: current?.startedAt,
    duration: current?.duration,
    wonAt: Date.now(),
  };
  await kv.set(ROULETTE_KEY, state);
  return state;
}

export async function resetRoulette(): Promise<void> {
  await kv.del(ROULETTE_KEY);
}
