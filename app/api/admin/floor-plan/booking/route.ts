import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — All active bookings for today
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const bookings = await prisma.booking.findMany({
      where: {
        isActive: true,
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        table: { select: { id: true, label: true, seats: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({ success: true, data: bookings });
  } catch (error) {
    console.error("[GET /api/admin/floor-plan/booking]", error);
    return NextResponse.json(
      { success: false, message: "Failed to load bookings" },
      { status: 500 }
    );
  }
}

// POST — Create a booking
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tableId,
      customerId,
      guestName,
      guestPhone,
      guestCount,
      date,
      startTime,
      endTime,
      notes,
    } = body;

    if (!tableId || !date || !startTime) {
      return NextResponse.json(
        { success: false, message: "tableId, date, and startTime are required" },
        { status: 400 }
      );
    }

    if (!guestName && !customerId) {
      return NextResponse.json(
        { success: false, message: "Provide either guestName or customerId" },
        { status: 400 }
      );
    }

    // Check table exists
    const table = await prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      return NextResponse.json(
        { success: false, message: "Table not found" },
        { status: 404 }
      );
    }

    if (guestCount > table.seats) {
      return NextResponse.json(
        {
          success: false,
          message: `Table ${table.label} has only ${table.seats} seats, ${guestCount} requested`,
        },
        { status: 400 }
      );
    }

    // Check for overlapping bookings
    const bookingDate = new Date(date);
    const startOfDay = new Date(bookingDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(bookingDate.setHours(23, 59, 59, 999));

    const existingBookings = await prisma.booking.findMany({
      where: {
        tableId,
        isActive: true,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    const hasOverlap = existingBookings.some((b) => {
      if (!endTime || !b.endTime) return b.startTime === startTime;
      return startTime < b.endTime && endTime > b.startTime;
    });

    if (hasOverlap) {
      return NextResponse.json(
        {
          success: false,
          message: `Table ${table.label} already booked for that time slot`,
        },
        { status: 409 }
      );
    }

    const booking = await prisma.booking.create({
      data: {
        tableId,
        customerId: customerId || null,
        guestName: guestName || null,
        guestPhone: guestPhone || null,
        guestCount: guestCount || 1,
        date: new Date(date),
        startTime,
        endTime: endTime || null,
        notes: notes || null,
        isActive: true,
      },
      include: {
        table: { select: { id: true, label: true, seats: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    // Update table status
    await prisma.table.update({
      where: { id: tableId },
      data: { status: "RESERVED" },
    });

    return NextResponse.json({
      success: true,
      message: `Table ${table.label} booked successfully`,
      data: booking,
    });
  } catch (error) {
    console.error("[POST /api/admin/floor-plan/booking]", error);
    return NextResponse.json(
      { success: false, message: "Failed to create booking" },
      { status: 500 }
    );
  }
}

// DELETE — Cancel a booking
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("id");

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: "Booking ID required" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { isActive: false },
    });

    // Check if table has any remaining active bookings today
    const today = new Date();
    const remaining = await prisma.booking.count({
      where: {
        tableId: booking.tableId,
        isActive: true,
        date: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lte: new Date(today.setHours(23, 59, 59, 999)),
        },
      },
    });

    // Check if table has active orders
    const activeOrders = await prisma.order.count({
      where: {
        tableId: booking.tableId,
        status: "DRAFT",
      },
    });

    if (remaining === 0 && activeOrders === 0) {
      await prisma.table.update({
        where: { id: booking.tableId },
        data: { status: "AVAILABLE" },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Booking cancelled",
    });
  } catch (error) {
    console.error("[DELETE /api/admin/floor-plan/booking]", error);
    return NextResponse.json(
      { success: false, message: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}