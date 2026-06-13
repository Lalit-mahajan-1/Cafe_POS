"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const oauthError = useMemo(() => {
    const err = searchParams.get("error");
    if (err === "google_denied") return "Google login was cancelled.";
    if (err === "oauth_failed") return "Google login failed. Try again.";
    return "";
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          typeof data.error === "string" ? data.error : "Login failed",
        );
      const dest = data.user.role === "ADMIN" ? "/admin" : "/dashboard";
      router.push(dest);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto mt-20 p-6 border rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Login</h1>

      {/* Google Button */}
      <a
        href="/api/auth/google"
        className="flex items-center justify-center gap-2 w-full border border-gray-300 py-2 rounded hover:bg-gray-50 mb-4"
      >
        <span>Continue with Google</span>
      </a>

      <div className="flex items-center gap-2 my-4">
        <div className="flex-1 h-px bg-gray-300" />
        <span className="text-sm text-gray-500">OR</span>
        <div className="flex-1 h-px bg-gray-300" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {(error || oauthError) && <p className="mt-4 text-red-600">{error || oauthError}</p>}
      <p className="mt-4 text-sm">
        No account?{" "}
        <Link href="/register" className="text-blue-600">
          Register
        </Link>
      </p>
    </main>
  );
}
