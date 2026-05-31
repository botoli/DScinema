import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/app/lib/kv";

const WINNERS_KEY = "winners";

function generateId(): string {
  return Math.random().toString(36).substring(2, 12);
}

// GET /api/winners — получить всех победителей
export async function GET() {
  try {
    const winners = (await kv.get<any[]>(WINNERS_KEY)) || [];
    return NextResponse.json(winners);
  } catch (error) {
    console.error("Error fetching winners:", error);
    return NextResponse.json(
      { error: "Failed to fetch winners" },
      { status: 500 },
    );
  }
}

// POST /api/winners — добавить победителя
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const winners = (await kv.get<any[]>(WINNERS_KEY)) || [];

    const newWinner = {
      ...body,
      id: generateId(),
    };

    winners.push(newWinner);
    await kv.set(WINNERS_KEY, winners);

    return NextResponse.json(newWinner, { status: 201 });
  } catch (error) {
    console.error("Error adding winner:", error);
    return NextResponse.json(
      { error: "Failed to add winner" },
      { status: 500 },
    );
  }
}
