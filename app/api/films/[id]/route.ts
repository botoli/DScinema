import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/app/lib/kv";

const FILMS_KEY = "films";

// GET /api/films/[id] — получить фильм по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const films = (await kv.get<any[]>(FILMS_KEY)) || [];
    const film = films.find((f) => f.id === id);

    if (!film) {
      return NextResponse.json({ error: "Film not found" }, { status: 404 });
    }

    return NextResponse.json(film);
  } catch (error) {
    console.error("Error fetching film:", error);
    return NextResponse.json(
      { error: "Failed to fetch film" },
      { status: 500 },
    );
  }
}

// PATCH /api/films/[id] — обновить фильм
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const films = (await kv.get<any[]>(FILMS_KEY)) || [];

    const index = films.findIndex((f) => f.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Film not found" }, { status: 404 });
    }

    films[index] = { ...films[index], ...body };
    await kv.set(FILMS_KEY, films);

    return NextResponse.json(films[index]);
  } catch (error) {
    console.error("Error updating film:", error);
    return NextResponse.json(
      { error: "Failed to update film" },
      { status: 500 },
    );
  }
}

// DELETE /api/films/[id] — удалить фильм
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const films = (await kv.get<any[]>(FILMS_KEY)) || [];

    const index = films.findIndex((f) => f.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Film not found" }, { status: 404 });
    }

    films.splice(index, 1);
    await kv.set(FILMS_KEY, films);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting film:", error);
    return NextResponse.json(
      { error: "Failed to delete film" },
      { status: 500 },
    );
  }
}
