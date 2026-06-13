"use client";

import { useEffect, useState } from "react";

type Seat = {
  id: string;
  number: string;
  isBooked: boolean;
  booking: { user: { name: string } } | null;
};

export default function BookSeatPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSeats = async () => {
    const res = await fetch("/api/seats");
    const data = await res.json();
    setSeats(data.seats || []);
  };

  useEffect(() => {
    fetchSeats();
  }, []);

  const handleBook = async (seatId: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/seats/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Booking failed");

      setMessage({ type: "success", text: `✅ Booked seat ${data.booking.seat.number}!` });
      await fetchSeats();
    } catch (err: any) {
      setMessage({ type: "error", text: `❌ ${err.message}` });
      await fetchSeats(); // refresh to show actual state
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto mt-10 p-6">
      <h1 className="text-3xl font-bold mb-2">🎟️ Book a Seat</h1>
      <p className="text-gray-600 mb-6">Click any green seat to book it</p>

      {message && (
        <div
          className={`mb-4 p-3 rounded ${
            message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-10 gap-2">
        {seats.map((seat) => (
          <button
            key={seat.id}
            disabled={seat.isBooked || loading}
            onClick={() => handleBook(seat.id)}
            title={seat.isBooked ? `Booked by ${seat.booking?.user.name}` : "Available"}
            className={`p-3 rounded font-semibold text-sm transition ${
              seat.isBooked
                ? "bg-red-500 text-white cursor-not-allowed opacity-70"
                : "bg-green-500 text-white hover:bg-green-600 cursor-pointer"
            }`}
          >
            {seat.number}
          </button>
        ))}
      </div>

      <div className="mt-6 flex gap-4 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 bg-green-500 rounded"></span> Available
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 bg-red-500 rounded"></span> Booked
        </span>
      </div>

      <button
        onClick={fetchSeats}
        className="mt-6 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        🔄 Refresh
      </button>
    </main>
  );
}