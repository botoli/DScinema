import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { NextRequest } from "next/server";
import { kv } from "./kv";
import { startRoulette, RouletteInputError } from "./roulette-db";
import { PATCH } from "../api/films/[id]/route";
import type { Film } from "../services/api";

let store: Map<string, unknown>;
beforeEach(() => {
  store = new Map<string, unknown>([["films", [
    { id: "a", title: "Первый", from: "Артём" },
    { id: "b", title: "Второй", from: "Артём", hidden: false },
    { id: "c", title: "Скрытый", from: "Миша", hidden: true },
  ]]]);
  mock.method(kv, "get", async (key: string) => structuredClone(store.get(key) ?? null));
  mock.method(kv, "set", async (key: string, value: unknown) => { store.set(key, structuredClone(value)); return "OK"; });
});
afterEach(() => mock.restoreAll());

function setHidden(id: string, hidden: unknown) {
  return PATCH(new NextRequest(`http://localhost/api/films/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hidden }),
  }), { params: Promise.resolve({ id }) });
}

test("Рулетка исключает скрытые, удалённые и повторяющиеся ID", async () => {
  const state = await startRoulette(["a", "c", "b", "missing", "a"]);
  assert.deepEqual(state.filmIds, ["a", "b"]);
  assert.ok(state.reelFilmIds.every((id) => id === "a" || id === "b"));
  assert.ok(state.winnerId === "a" || state.winnerId === "b");
});

test("Рулетка не запускается, если осталось меньше двух доступных фильмов", async () => {
  await assert.rejects(startRoulette(["a", "c", "a"]), RouletteInputError);
  assert.equal(store.has("roulette"), false);
});

test("Скрытие сохраняется, а возврат снова допускает фильм в рулетку", async () => {
  const hiddenResponse = await setHidden("a", true);
  assert.equal(hiddenResponse.status, 200);
  assert.equal((store.get("films") as Film[]).find((film) => film.id === "a")?.hidden, true);
  await assert.rejects(startRoulette(["a", "b", "c"]), RouletteInputError);
  const restoredResponse = await setHidden("a", false);
  assert.equal(restoredResponse.status, 200);
  assert.deepEqual((await startRoulette(["a", "b", "c"])).filmIds, ["a", "b"]);
});

test("Участвующий фильм нельзя скрыть во время вращения", async () => {
  await startRoulette(["a", "b"]);
  const response = await setHidden("a", true);
  assert.equal(response.status, 409);
  assert.equal((store.get("films") as Film[]).find((film) => film.id === "a")?.hidden, undefined);
});

test("Значение видимости проверяется перед сохранением", async () => {
  const response = await setHidden("a", "false");
  assert.equal(response.status, 400);
  assert.equal((store.get("films") as Film[]).find((film) => film.id === "a")?.hidden, undefined);
});
