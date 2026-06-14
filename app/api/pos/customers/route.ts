import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ── GET /api/pos/customers ────────────────────────────────────────────────
//
//  Modes (detected by query params):
//
//  1. ?limit=N [&phone=X]   → dropdown search (returns { customers: [] })
//  2. ?phone=EXACT           → legacy single lookup (returns { customer })
//  3. (no params)            → full list for /customers page ({ customers: [] })
//
export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "EMPLOYEE"]);

    const phoneParam = req.nextUrl.searchParams.get("phone")?.trim() ?? "";
    const limitParam = req.nextUrl.searchParams.get("limit");

    // ── Mode 1: Dropdown search ──────────────────────────────────────────
    // Presence of `limit` param → multi-result search for POS dropdown
    if (limitParam !== null) {
      const limit = Math.min(Math.max(Number(limitParam) || 4, 1), 20);

      const customers = await prisma.customer.findMany({
        where: phoneParam
          ? {
              OR: [
                { phone: { startsWith: phoneParam } },
                { name:  { contains: phoneParam, mode: "insensitive" } },
              ],
            }
          : {},
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id:    true,
          name:  true,
          phone: true,
          email: true,
          _count: { select: { orders: true } },
        },
      });

      return NextResponse.json({ customers });
    }

    // ── Mode 2: Legacy single exact-match lookup ──────────────────────────
    // ?phone=XXXXXXXXXX (no limit param)
    if (phoneParam) {
      const customer = await prisma.customer.findFirst({
        where: { phone: phoneParam },
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

      return NextResponse.json({ customer: customer ?? null });
    }

    // ── Mode 3: Full list — /customers page ───────────────────────────────
    // No params at all → return all customers for the customers page
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id:        true,
        name:      true,
        phone:     true,
        email:     true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { orders: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            orderNumber: true,
            total:       true,
            createdAt:   true,
            status:      true,
          },
        },
      },
    });

    return NextResponse.json({ customers });
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch customers" },
      { status: 401 }
    );
  }
}

// ── POST /api/pos/customers ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "EMPLOYEE"]);

    const body = await req.json();

    const name  = String(body.name  || "").trim();
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