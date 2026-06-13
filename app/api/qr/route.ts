import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function POST(req: NextRequest) {
  try {
    const { text, color, bgColor, size } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text or URL is required" }, { status: 400 });
    }

    // Generate QR as data URL (base64 PNG)
    const qr = await QRCode.toDataURL(text, {
      width: parseInt(size) || 300,
      margin: 2,
      color: {
        dark: color || "#000000",
        light: bgColor || "#ffffff",
      },
      errorCorrectionLevel: "H", // Highest error correction (30% damage tolerance)
    });

    return NextResponse.json({ qr });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}