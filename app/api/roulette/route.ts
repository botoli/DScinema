import { NextRequest, NextResponse } from "next/server";
import {
  getRouletteState,
  startRoulette,
  eliminateFilm,
  finishRoulette,
  resetRoulette,
} from "@/app/lib/roulette-db";

export async function GET() {
  try {
    const state = await getRouletteState();
    return NextResponse.json(
      state ?? {
        active: false,
        eliminatedIds: [],
        winner: null,
        filmIds: [],
        wonAt: undefined,
      },
    );
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

    switch (action) {
      case "start":
        await startRoulette(body.filmIds);
        break;
      case "eliminate":
        await eliminateFilm(body.filmId);
        break;
      case "finish":
        await finishRoulette(body.winner, body.wonAt);
        break;
      case "reset":
        await resetRoulette();
        break;
      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 },
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error handling roulette action:", error);
    return NextResponse.json(
      { error: "Failed to handle roulette action" },
      { status: 500 },
    );
  }
}
