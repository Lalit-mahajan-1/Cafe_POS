import { z } from "zod";

export const bookSeatSchema = z.object({
  seatId: z.string().min(1, "Seat ID required"),
});

export type BookSeatInput = z.infer<typeof bookSeatSchema>;