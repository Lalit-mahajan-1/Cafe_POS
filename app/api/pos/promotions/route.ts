import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireRole(["ADMIN", "EMPLOYEE"]);

    const now = new Date();

    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        OR: [
          { validTill: null },
          { validTill: { gte: now } }
        ]
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ promotions });
  } catch (error) {
    console.error("[GET /api/pos/promotions]", error);
    return NextResponse.json(
      { error: "Unable to load active promotions" },
      { status: 500 }
    );
  }
}
