import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { findAvatarFilename } from "@/lib/uploads/avatar-storage";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await params;

  if (!uuid || uuid.includes("..") || uuid.includes("/")) {
    return NextResponse.json({ error: "Invalid avatar id" }, { status: 400 });
  }

  const filename = await findAvatarFilename(uuid);
  if (!filename) {
    return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const filePath = path.join(process.cwd(), "public", "uploads", "avatars", filename);
  const buffer = await readFile(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
