import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "DEEPGRAM_API_KEY missing" }, { status: 500 });
  }
  // ⚠️ Localhost/learning only. For production, use temp keys.
  return NextResponse.json({ token: apiKey });
}