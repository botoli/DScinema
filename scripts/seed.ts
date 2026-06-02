// scripts/seed.ts
// Запуск: npx tsx scripts/seed.ts
import { createClient } from "@vercel/kv";
import * as fs from "fs";
import * as path from "path";

// Загружаем .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envLines = envContent.split("\n");
const env: Record<string, string> = {};
for (const line of envLines) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Убираем кавычки
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }
}

async function main() {
  const kv = createClient({
    url: env["KV_REST_API_URL"]!,
    token: env["KV_REST_API_TOKEN"]!,
  });

  // Читаем db.json
  const dbPath = path.resolve(process.cwd(), "db.json");
  const dbContent = fs.readFileSync(dbPath, "utf-8");
  const db = JSON.parse(dbContent);

  // Сохраняем films
  if (db.films && db.films.length > 0) {
    await kv.set("films", db.films);
    console.log(`✅ Загружено ${db.films.length} фильмов`);
  } else {
    console.log("⚠️ Фильмы не найдены в db.json");
  }

  // Сохраняем winners
  if (db.winners && db.winners.length > 0) {
    await kv.set("winners", db.winners);
    console.log(`✅ Загружено ${db.winners.length} победителей`);
  } else {
    console.log("⚠️ Победители не найдены в db.json");
  }

  // Patch notes по умолчанию
  const defaultPatchNotes = [
    {
      version: "v1.1",
      description: "Подсказки, если забыли выбрать себя или фильм",
      date: "2026-06-02",
    },
    {
      version: "v1.0",
      description: "Запуск модалки добавления фильмов",
      date: "2026-06-01",
    },
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
