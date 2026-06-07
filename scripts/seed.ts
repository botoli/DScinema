// scripts/seed.ts
// Запуск: npx tsx scripts/seed.ts
import { createClient } from "@vercel/kv";
import * as fs from "node:fs";
import * as path from "node:path";

const DB_PATH = path.resolve(process.cwd(), "db.json");

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};

  // Next.js automatically loads .env.local, but tsx does not — загружаем вручную
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return env;

  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const kvUrl = env["KV_URL"] || env["KV_REST_API_URL"];

  if (!kvUrl) {
    // Локальный режим: убеждаемся, что db.json существует с дефолтными данными
    console.log("[seed] KV_URL не задан — работаем с локальным db.json");

    let db: { films?: unknown[]; winners?: unknown[]; patchNotes?: unknown[] };
    try {
      db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    } catch {
      db = {};
    }

    const changed = [];

    if (!db.films) {
      db.films = [];
      changed.push("films");
    }
    if (!db.winners) {
      db.winners = [];
      changed.push("winners");
    }
    if (!db.patchNotes) {
      db.patchNotes = [
        { version: "v1.1", description: "Подсказки, если забыли выбрать себя или фильм", date: "2026-06-02" },
        { version: "v1.0", description: "Запуск модалки добавления фильмов", date: "2026-06-01" },
      ];
      changed.push("patchNotes");
    }

    if (changed.length > 0) {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
      console.log(`✅ Инициализировано: ${changed.join(", ")}`);
    } else {
      console.log("ℹ️ db.json уже содержит все ключи, пропускаем");
    }
    return;
  }

  // Удалённый режим: Vercel KV
  // rediss://default:<token>@<endpoint>.upstash.io:6379 → https://<endpoint>.upstash.io + token
  let restUrl = kvUrl;
  let restToken = env["KV_REST_API_TOKEN"];

  const redissMatch = kvUrl.match(
    /^rediss?:\/\/default:(.+)@(.+)\.upstash\.io:\d+$/,
  );
  if (redissMatch) {
    restUrl = `https://${redissMatch[2]}.upstash.io`;
    restToken = redissMatch[1];
  }

  const kv = createClient({ url: restUrl, token: restToken });

  console.log(`[seed] Подключаюсь к ${kvUrl}...`);

  const dbContent = fs.readFileSync(DB_PATH, "utf-8");
  const db = JSON.parse(dbContent);

  if (db.films && db.films.length > 0) {
    await kv.set("films", db.films);
    console.log(`✅ Загружено ${db.films.length} фильмов`);
  } else {
    console.log("⚠️ Фильмы не найдены в db.json");
  }

  if (db.winners && db.winners.length > 0) {
    await kv.set("winners", db.winners);
    console.log(`✅ Загружено ${db.winners.length} победителей`);
  } else {
    console.log("⚠️ Победители не найдены в db.json");
  }

  const defaultPatchNotes = [
    { version: "v1.1", description: "Подсказки, если забыли выбрать себя или фильм", date: "2026-06-02" },
    { version: "v1.0", description: "Запуск модалки добавления фильмов", date: "2026-06-01" },
  ];

  const existingNotes = await kv.get("patchNotes");
  if (!existingNotes) {
    await kv.set("patchNotes", defaultPatchNotes);
    console.log("✅ Загружены patch notes по умолчанию");
  } else {
    console.log("ℹ️ Patch notes уже существуют, пропускаем");
  }

  console.log("✅ Данные успешно перенесены в Redis!");
}

main().catch(console.error);
