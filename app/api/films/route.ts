import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/app/lib/kv";

const FILMS_KEY = "films";

function generateId(): string {
  return Math.random().toString(36).substring(2, 12);
}

// GET /api/films — получить все фильмы
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q");
    const from = searchParams.get("from");
    const engName = searchParams.get("engName");

    const films = (await kv.get<any[]>(FILMS_KEY)) || [];

    let result = [...films];

    if (q) {
      const query = q.toLowerCase();
      result = result.filter(
        (f) =>
          f.title?.toLowerCase().includes(query) ||
          f.engName?.toLowerCase().includes(query),
      );
    }

    if (from) {
      result = result.filter((f) => f.from === from);
    }

    if (engName) {
      result = result.filter((f) => f.engName === engName);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching films:", error);
    return NextResponse.json(
      { error: "Failed to fetch films" },
      { status: 500 },
    );
  }
}

// POST /api/films — добавить фильм
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const films = (await kv.get<any[]>(FILMS_KEY)) || [];

    const newFilm = {
      ...body,
      id: generateId(),
      addedAt: new Date().toISOString(),
    };

    films.push(newFilm);
    await kv.set(FILMS_KEY, films);

    return NextResponse.json(newFilm, { status: 201 });
  } catch (error) {
    console.error("Error adding film:", error);
    return NextResponse.json({ error: "Failed to add film" }, { status: 500 });
  }
}
