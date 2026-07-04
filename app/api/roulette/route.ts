import { NextRequest, NextResponse } from "next/server";
import {
  getRouletteState,
  startRoulette,
  eliminateFilm,
  finishRoulette,
  resetRoulette,
  emptyRouletteState,
} from "@/app/lib/roulette-db";

export async function GET() {
  try {
    const state = await getRouletteState();
    return NextResponse.json({ ...(state ?? emptyRouletteState()), serverTime: Date.now() });
  } catch (error) {
    console.error("Error fetching roulette state:", error);
    return NextResponse.json(
      { error: "Failed to fetch roulette state" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    let state;
    switch (action) {
      case "start":
        state = await startRoulette(body.filmIds);
        break;
      case "eliminate":
        await eliminateFilm(body.filmId);
        state = await getRouletteState();
        break;
      case "finish":
        state = await finishRoulette(body.winner);
        break;
      case "reset":
        await resetRoulette();
        state = emptyRouletteState();
        break;
      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 },
        );
    }

    return NextResponse.json({ ...(state ?? emptyRouletteState()), serverTime: Date.now() });
  } catch (error) {
    console.error("Error handling roulette action:", error);
    return NextResponse.json(
      { error: "Failed to handle roulette action" },
      { status: 500 },
    );
  }
}
