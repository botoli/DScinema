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

  const API_KEY = process.env.KINOPOISK_API_KEY; // Токен хранится в .env.local без NEXT_PUBLIC_

  try {
    const response = await fetch(
      `https://api.poiskkino.dev/v1.4/movie/search?page=${page}&limit=${limit}&query=${encodeURIComponent(query)}`,
      {
        headers: {
          "X-API-KEY": API_KEY || "",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search movies" },
      { status: 500 },
    );
  }
}
