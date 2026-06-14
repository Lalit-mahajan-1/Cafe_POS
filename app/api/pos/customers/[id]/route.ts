import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ── GET /api/pos/customers/[id] ───────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN", "EMPLOYEE"]);

    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

// ── PATCH /api/pos/customers/[id] ─────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN", "EMPLOYEE"]);

    const { id } = await params;

    // Check customer exists first
    const existing = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const body = await req.json();

    const name  = body.name  ? String(body.name).trim()  : undefined;
    const phone = body.phone ? String(body.phone).trim() : undefined;
    const email = body.email !== undefined
      ? (body.email ? String(body.email).trim() : null)
      : undefined;

    // Validate at least one field
    if (name === undefined && phone === undefined && email === undefined) {
      return NextResponse.json(
        { error: "Provide at least one field to update" },
        { status: 400 }
      );
    }

    // If phone is being changed, check uniqueness
    if (phone && phone !== existing.phone) {
      const conflict = await prisma.customer.findFirst({
        where: { phone, NOT: { id } },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "A customer with this phone number already exists" },
          { status: 409 }
        );
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name  !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
      },
      include: {
        _count: { select: { orders: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            orderNumber: true,
            total: true,
            createdAt: true,
            status: true,
          },
        },
      },
    });

    // Serialize dates for client
    return NextResponse.json({
      customer: {
        id:        customer.id,
        name:      customer.name,
        phone:     customer.phone,
        email:     customer.email,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        _count:    customer._count,
        orders:    customer.orders.map((o) => ({
          orderNumber: o.orderNumber,
          total:       o.total,
          createdAt:   o.createdAt.toISOString(),
          status:      o.status,
        })),
      },
    });
  } catch (err) {
    console.error("[PATCH /api/pos/customers/[id]]", err);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}