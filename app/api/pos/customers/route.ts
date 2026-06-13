import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "EMPLOYEE"]);

    const phone = req.nextUrl.searchParams.get("phone")?.trim();
    if (!phone) {
      return NextResponse.json({ customer: null });
    }

    const customer = await prisma.customer.findFirst({
      where: { phone },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { orders: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { orderNumber: true, total: true, createdAt: true },
        },
      },
    });

    return NextResponse.json({ customer });
  } catch {
    return NextResponse.json({ error: "Unable to find customer" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "EMPLOYEE"]);
    const body = await req.json();

    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = body.email ? String(body.email).trim() : null;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: { name, phone, email: email || null },
      include: { _count: { select: { orders: true } } },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create customer" }, { status: 500 });
  }
}
