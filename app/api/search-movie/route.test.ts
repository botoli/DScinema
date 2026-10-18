import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { NextRequest } from "next/server";
import { GET } from "./route";

const originalFetch = globalThis.fetch;
const originalKey = process.env.KINOPOISK_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.KINOPOISK_API_KEY;
  else process.env.KINOPOISK_API_KEY = originalKey;
});

test("Поиск использует ПоискКино и сохраняет результаты и пагинацию", async () => {
  process.env.KINOPOISK_API_KEY = "test-server-key";
  const docs = [{ id: 301, name: "Матрица", year: 1999, rating: { kp: 8.5 } }];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://api.poiskkino.dev");
    assert.equal(url.pathname, "/v1.5/movie/search");
    assert.equal(url.searchParams.get("query"), "Матрица");
    assert.equal(url.searchParams.get("page"), "2");
    assert.equal(url.searchParams.get("limit"), "5");
    assert.equal(new Headers(init?.headers).get("X-API-KEY"), "test-server-key");
    return Response.json({ docs, page: 2, limit: 5, total: 11, pages: 3 });
  };
  const response = await GET(new NextRequest("http://localhost/api/search-movie?query=Матрица&page=2&limit=5"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { docs, page: 2, limit: 5, total: 11, pages: 3 });
});

test("Пустой результат является успешным поиском", async () => {
  process.env.KINOPOISK_API_KEY = "test-server-key";
  globalThis.fetch = async () => Response.json({ docs: [] });
  const response = await GET(new NextRequest("http://localhost/api/search-movie?query=йцу"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { docs: [] });
});

test("Без серверного ключа внешний запрос не отправляется", async () => {
  delete process.env.KINOPOISK_API_KEY;
  globalThis.fetch = async () => { throw new Error("Неожиданный внешний запрос"); };
  const response = await GET(new NextRequest("http://localhost/api/search-movie?query=test"));
  assert.equal(response.status, 500);
});

test("Ошибка авторизации провайдера различима в ответе сервера", async () => {
  process.env.KINOPOISK_API_KEY = "test-server-key";
  globalThis.fetch = async () => Response.json({ message: "Unauthorized" }, { status: 401 });
  const response = await GET(new NextRequest("http://localhost/api/search-movie?query=test"));
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.upstreamStatus, 401);
  assert.match(body.error, /ключ/i);
});
