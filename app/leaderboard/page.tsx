"use client";

import { useEffect, useState } from "react";

type User = { id: string; name: string; score: number; avatar?: string };

export default function LeaderboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [source, setSource] = useState<"cache" | "db" | "">("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [fetchTime, setFetchTime] = useState(0);

  const fetchLeaderboard = async () => {
    const start = Date.now();
    const res = await fetch("/api/leaderboard");
    const data = await res.json();
    setFetchTime(Date.now() - start);
    setUsers(data.users || []);
    setSource(data.source || "");
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const handleIncrement = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/leaderboard/increment", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setMessage(`⚠️ ${data.error}`);
      } else {
        setMessage(
          `✅ Score: ${data.user.score} (${data.rateLimit.remaining} requests left)`
        );
        await fetchLeaderboard();
      }
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto mt-10 p-6">
      <h1 className="text-3xl font-bold mb-2">🏆 Leaderboard</h1>
      <p className="text-gray-600 mb-6">
        Demonstrates Redis caching + rate limiting
      </p>

      {/* Source indicator */}
      <div className="mb-4 flex gap-2 text-sm">
        <span
          className={`px-3 py-1 rounded ${
            source === "cache"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          Source: {source === "cache" ? "🔥 Redis Cache" : "🐢 Database"}
        </span>
        <span className="px-3 py-1 rounded bg-gray-100">
          ⏱ {fetchTime}ms
        </span>
      </div>

      {/* Action button */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={handleIncrement}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "..." : "+1 Score"}
        </button>
        <button
          onClick={fetchLeaderboard}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          🔄 Refresh
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded">
          {message}
        </div>
      )}

      {/* Leaderboard table */}
      <div className="border rounded overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 grid grid-cols-12 font-semibold text-sm">
          <div className="col-span-1">#</div>
          <div className="col-span-8">Name</div>
          <div className="col-span-3 text-right">Score</div>
        </div>
        {users.length === 0 && (
          <div className="p-6 text-center text-gray-500">No users yet</div>
        )}
        {users.map((u, i) => (
          <div
            key={u.id}
            className="px-4 py-3 grid grid-cols-12 items-center border-t"
          >
            <div className="col-span-1 font-bold">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
            </div>
            <div className="col-span-8">{u.name}</div>
            <div className="col-span-3 text-right font-mono">{u.score}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded text-sm space-y-2">
        <p><strong>🧪 How to Test:</strong></p>
        <p>1. Click "+1 Score" → cache invalidates, next fetch hits DB</p>
        <p>2. Click "Refresh" → served from Redis cache (faster!)</p>
        <p>3. Click "+1 Score" 6 times fast → 6th gets rate-limited</p>
        <p>4. Wait 30s → cache expires, next fetch hits DB again</p>
      </div>
    </main>
  );
}