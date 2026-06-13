import { prisma } from "@/lib/prisma";

export const seatService = {
  async getAllSeats() {
    return prisma.seat.findMany({
      orderBy: { number: "asc" },
      include: {
        booking: {
          include: { user: { select: { name: true } } },
        },
      },
    });
  },

  /**
   * Book a seat with proper concurrency control.
   * Uses a transaction with row-level lock (SELECT FOR UPDATE).
   * If two users click at the same time, the second one will wait,
   * then see the seat is taken and get an error.
   */
  async bookSeat(seatId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      // 🔒 Lock the row — second request will WAIT here until first commits
      const seats = await tx.$queryRaw<
        { id: string; isBooked: boolean }[]
      >`SELECT id, "isBooked" FROM "Seat" WHERE id = ${seatId} FOR UPDATE`;

      const seat = seats[0];

      if (!seat) throw new Error("Seat not found");
      if (seat.isBooked) throw new Error("Seat already booked");

      // Mark seat as booked
      await tx.seat.update({
        where: { id: seatId },
        data: { isBooked: true },
      });

      // Create booking record
      const booking = await tx.booking.create({
        data: { seatId, userId },
        include: {
          seat: true,
          user: { select: { name: true, email: true } },
        },
      });

      return booking;
    });
    // Transaction commits here → lock released
  },
};