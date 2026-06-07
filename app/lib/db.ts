import { createClient, type VercelKV } from "@vercel/kv";
import * as fs from "node:fs";
import * as path from "node:path";

const DB_PATH = path.resolve(process.cwd(), "db.json");

interface LocalDB {
  films: unknown;
  winners: unknown;
  patchNotes: unknown;
}

function readLocal(): LocalDB {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { films: [], winners: [], patchNotes: [] };
  }
}

function writeLocal(data: LocalDB): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

type DB = Pick<VercelKV, "get" | "set" | "del">;

function createLocalDB(): DB {
  const cast = (db: LocalDB) => db as unknown as Record<string, unknown>;

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async get<TData = any>(key: string): Promise<TData | null> {
      const db = readLocal();
      return cast(db)[key] as TData | null;
    },
    async set(key: string, value: unknown): Promise<"OK" | null> {
      const db = readLocal();
      cast(db)[key] = value;
      writeLocal(db);
      return "OK";
    },
    async del(key: string): Promise<number> {
      const db = readLocal();
      if (cast(db)[key] !== undefined) {
        delete cast(db)[key];
        writeLocal(db);
        return 1;
      }
      return 0;
    },
  };
}

function parseKVConfig(): { url: string; token: string | undefined } {
  const raw = process.env.KV_URL ?? process.env.KV_REST_API_URL;
  if (!raw) throw new Error("KV_URL or KV_REST_API_URL is required");

  // rediss://default:<token>@<endpoint>.upstash.io:6379 → https://<endpoint>.upstash.io + token
  const redissMatch = raw.match(
    /^rediss?:\/\/default:(.+)@(.+)\.upstash\.io:\d+$/,
  );
  if (redissMatch) {
    return {
      url: `https://${redissMatch[2]}.upstash.io`,
      token: redissMatch[1],
    };
  }

  return { url: raw, token: process.env.KV_REST_API_TOKEN };
}

function createKVDB(): DB {
  const { url, token } = parseKVConfig();
  console.log(`[DB] Connecting to ${url}`);
  return createClient({ url, token });
}

const useKV = !!(process.env.KV_URL || process.env.KV_REST_API_URL);

console.log(`[DB] Using ${useKV ? "Vercel KV" : "local db.json"}`);

export const db: DB = useKV ? createKVDB() : createLocalDB();
