import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const floor = await prisma.floor.findFirst({
      include: {
        tables: {
          where: { isActive: true },
          orderBy: [{ row: "asc" }, { col: "asc" }],
          include: {
            orders: {
              where: { status: { in: ["DRAFT", "PAID"] } },
              select: {
                id: true,
                orderNumber: true,
                total: true,
                status: true,
                createdAt: true,
                customer: {
                  select: { id: true, name: true, phone: true },
                },
                employee: {
                  select: { id: true, name: true },
                },
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            bookings: {
              where: {
                isActive: true,
                date: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0)),
                  lte: new Date(new Date().setHours(23, 59, 59, 999)),
                },
              },
              select: {
                id: true,
                guestName: true,
                guestCount: true,
                startTime: true,
                endTime: true,
                customer: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!floor) {
      return NextResponse.json({ success: true, data: null });
    }

    const enrichedTables = floor.tables.map((table) => {
      const activeOrder = table.orders[0] ?? null;
      const todayBookings = table.bookings;

      let status: "AVAILABLE" | "OCCUPIED" | "RESERVED" = table.status || "AVAILABLE";
      if (activeOrder) status = "OCCUPIED";
      else if (status !== "RESERVED" && todayBookings.length > 0) status = "RESERVED";

      return {
        id: table.id,
        label: table.label,
        row: table.row,
        col: table.col,
        seats: table.seats,
        width: table.width,
        height: table.height,
        shape: table.shape,
        status,
        activeOrder,
        todayBookings,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        id: floor.id,
        name: floor.name,
        rows: floor.rows,
        cols: floor.cols,
        tables: enrichedTables,
        summary: {
          total: enrichedTables.length,
          available: enrichedTables.filter((t) => t.status === "AVAILABLE").length,
          occupied: enrichedTables.filter((t) => t.status === "OCCUPIED").length,
          reserved: enrichedTables.filter((t) => t.status === "RESERVED").length,
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/pos/floor]", error);
    return NextResponse.json(
      { success: false, message: "Failed to load floor" },
      { status: 500 }
    );
  }
}