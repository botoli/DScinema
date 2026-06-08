import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const title = searchParams.get("title");
  const yearStr = searchParams.get("year");

  if (!title) {
    return NextResponse.json(
      { error: "Title parameter is required" },
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
      `https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(title)}&page=1`,
      {
        headers: { "X-API-KEY": API_KEY },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const films = data.films ?? [];

    let bestMatch: any = null;
    let bestScore = 0;

    for (const film of films) {
      const filmTitle = film.nameRu || film.nameEn || "";
      const searchTitle = title.toLowerCase();
      const compareTitle = filmTitle.toLowerCase();

      let score = 0;
      if (compareTitle === searchTitle) {
        score = 1;
      } else if (compareTitle.includes(searchTitle) || searchTitle.includes(compareTitle)) {
        score = 0.8;
      } else {
        const aWords = searchTitle.split(/\s+/);
        const bWords = compareTitle.split(/\s+/);
        const common = aWords.filter((w) => bWords.includes(w));
        score = common.length / Math.max(aWords.length, bWords.length);
      }

      if (yearStr) {
        const filmYear = film.year ? parseInt(film.year, 10) : null;
        if (filmYear && filmYear === parseInt(yearStr, 10)) {
          score += 0.15;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = film;
      }
    }

    if (!bestMatch || bestScore < 0.3) {
      return NextResponse.json(
        { error: "Movie not found" },
        { status: 404 },
      );
    }

    const year = bestMatch.year ? parseInt(bestMatch.year, 10) : undefined;

    return NextResponse.json({
      id: bestMatch.filmId,
      title: bestMatch.nameRu || bestMatch.nameEn || "",
      originalTitle: bestMatch.nameEn || undefined,
      year: year && !isNaN(year) ? year : undefined,
      description: bestMatch.description || bestMatch.shortDescription || null,
      poster: bestMatch.posterUrl || bestMatch.posterUrlPreview || null,
      rating: bestMatch.rating && bestMatch.rating !== "null"
        ? parseFloat(parseFloat(bestMatch.rating).toFixed(1))
        : undefined,
      countries: bestMatch.countries?.length
        ? bestMatch.countries.map((c: any) => c.country)
        : [],
      genres: bestMatch.genres?.length
        ? bestMatch.genres.map((g: any) => g.genre)
        : [],
    });
  } catch (error) {
    console.error("Movie detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch movie details" },
      { status: 500 },
    );
  }
}
