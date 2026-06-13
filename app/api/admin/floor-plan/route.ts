import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — Load floor plan with table statuses, active orders, and bookings
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
                guestPhone: true,
                guestCount: true,
                date: true,
                startTime: true,
                endTime: true,
                notes: true,
                customer: {
                  select: { id: true, name: true, phone: true },
                },
              },
              orderBy: { startTime: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!floor) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No floor plan saved yet",
      });
    }

    // Enrich each table with computed status
    const enrichedTables = floor.tables.map((table) => {
      const activeOrder = table.orders[0] ?? null;
      const todayBookings = table.bookings;

      let computedStatus: "AVAILABLE" | "OCCUPIED" | "RESERVED" = "AVAILABLE";

      if (activeOrder) {
        computedStatus = "OCCUPIED";
      } else if (todayBookings.length > 0) {
        computedStatus = "RESERVED";
      }

      return {
        id: table.id,
        label: table.label,
        row: table.row,
        col: table.col,
        seats: table.seats,
        width: table.width,
        height: table.height,
        shape: table.shape,
        isActive: table.isActive,
        status: computedStatus,
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
    console.error("[GET /api/admin/floor-plan]", error);
    return NextResponse.json(
      { success: false, message: "Failed to load floor plan" },
      { status: 500 }
    );
  }
}

// POST — Save floor layout
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rows, cols, tables } = body as {
      rows: number;
      cols: number;
      tables: {
        id: string;
        label: string;
        row: number;
        col: number;
        seats: number;
        width: number;
        height: number;
        shape: "round" | "square" | "booth";
      }[];
    };

    if (!rows || !cols || !Array.isArray(tables)) {
      return NextResponse.json(
        { success: false, message: "Invalid payload" },
        { status: 400 }
      );
    }

    const outOfBounds = tables.filter(
      (t) => t.row > rows || t.col > cols || t.row < 1 || t.col < 1
    );

    if (outOfBounds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `${outOfBounds.length} table(s) outside grid boundaries`,
          outOfBounds: outOfBounds.map((t) => t.label),
        },
        { status: 400 }
      );
    }

    // Duplicate label check
    const labels = tables.map((t) => t.label.toUpperCase());
    const duplicateLabels = labels.filter(
      (label, i) => labels.indexOf(label) !== i
    );

    if (duplicateLabels.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Duplicate table names: ${[...new Set(duplicateLabels)].join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Duplicate position check
    const positions = tables.map((t) => `${t.row}-${t.col}`);
    const duplicatePositions = positions.filter(
      (pos, i) => positions.indexOf(pos) !== i
    );

    if (duplicatePositions.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Multiple tables at same position: ${[...new Set(duplicatePositions)].join(", ")}`,
        },
        { status: 400 }
      );
    }

    let floor = await prisma.floor.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (floor) {
      floor = await prisma.floor.update({
        where: { id: floor.id },
        data: { rows, cols },
      });
    } else {
      floor = await prisma.floor.create({
        data: { name: "Main Floor", rows, cols },
      });
    }

    // Delete old tables (cascades bookings too)
    await prisma.table.deleteMany({
      where: { floorId: floor.id },
    });

    // Insert new tables
    if (tables.length > 0) {
      await prisma.table.createMany({
        data: tables.map((t) => ({
          label: t.label,
          row: t.row,
          col: t.col,
          seats: t.seats,
          width: t.width,
          height: t.height,
          shape: t.shape,
          isActive: true,
          status: "AVAILABLE" as const,
          floorId: floor!.id,
        })),
      });
    }

    const saved = await prisma.floor.findUnique({
      where: { id: floor.id },
      include: {
        tables: {
          orderBy: [{ row: "asc" }, { col: "asc" }],
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Floor plan saved — ${tables.length} tables`,
      data: saved,
    });
  } catch (error) {
    console.error("[POST /api/admin/floor-plan]", error);
    return NextResponse.json(
      { success: false, message: "Failed to save floor plan" },
      { status: 500 }
    );
  }
}