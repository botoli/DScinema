// app/api/search-movie/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");
  const page = searchParams.get("page") || "1";
  const limit = searchParams.get("limit") || "10";

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter is required" },
      { status: 400 },
    );
  }

  const API_KEY = process.env.KINOPOISK_API_KEY;

  if (!API_KEY) {
    return NextResponse.json(
      { error: "API key is not configured" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(query)}&page=${page}`,
      {
        headers: {
          "X-API-KEY": API_KEY,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    const docs = (data.films || []).slice(0, Number(limit)).map((film: any) => {
      const year = film.year ? parseInt(film.year, 10) : undefined;

      return {
        id: film.filmId,
        name: film.nameRu || film.nameEn || "",
        alternativeName: film.nameEn || undefined,
        enName: film.nameEn || undefined,
        year: year && !isNaN(year) ? year : undefined,
        poster: {
          previewUrl: film.posterUrlPreview,
          url: film.posterUrl,
        },
        rating: film.rating && film.rating !== "null"
          ? { kp: parseFloat(parseFloat(film.rating).toFixed(1)) }
          : undefined,
        countries: film.countries?.length
          ? film.countries.map((c: any) => ({ name: c.country }))
          : undefined,
      };
    });

    return NextResponse.json({ docs });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search movies" },
      { status: 500 },
    );
  }
}
