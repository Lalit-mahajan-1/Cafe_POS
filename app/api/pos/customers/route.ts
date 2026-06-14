import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "EMPLOYEE"]);

    const phone = req.nextUrl.searchParams.get("phone")?.trim() || "";
    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam) || 4, 1), 20);

    // ── Multi-result search mode (used by the new dropdown) ────────────
    // Triggered when `limit` param is present in the URL
    if (limitParam !== null) {
      const customers = await prisma.customer.findMany({
        where: phone
          ? {
              OR: [
                { phone: { startsWith: phone } },
                { name: { contains: phone, mode: "insensitive" } },
              ],
            }
          : {},
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          _count: {
            select: { orders: true },
          },
        },
      });

      return NextResponse.json({ customers });
    }

    // ── Single-result exact match (legacy, kept for backward compat) ───
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
    return NextResponse.json(
      { error: "Unable to find customer" },
      { status: 401 }
    );
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
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    // Prevent duplicate phone numbers
    const existing = await prisma.customer.findFirst({
      where: { phone },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A customer with this phone number already exists" },
        { status: 409 }
      );
    }

    const customer = await prisma.customer.create({
      data: { name, phone, email: email || null },
      include: { _count: { select: { orders: true } } },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to create customer" },
      { status: 500 }
    );
  }
}