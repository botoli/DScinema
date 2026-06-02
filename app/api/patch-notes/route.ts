import { NextResponse } from "next/server";
import { kv } from "@/app/lib/kv";

const PATCH_NOTES_KEY = "patchNotes";

export interface PatchNote {
  version: string;
  description: string;
  date: string;
}

// GET /api/patch-notes — получить все patch notes
export async function GET() {
  try {
    const notes = (await kv.get<PatchNote[]>(PATCH_NOTES_KEY)) || [];
    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching patch notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch patch notes" },
      { status: 500 },
    );
  }
}
