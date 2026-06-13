"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Fraunces, DM_Sans } from "next/font/google";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const dmSans = DM_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

<<<<<<< HEAD
  const oauthError = useMemo(() => {
=======
  useEffect(() => {
    if (err === "oauth_failed") return "Google login failed. Try again.";
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
          typeof data.error === "string" ? data.error : "Login failed"
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
    <div className="w-full max-w-sm">
      <div
        className="bg-[#FDFBF7] rounded-2xl p-8 sm:p-10"
        style={{
          boxShadow:
            "0 4px 6px rgba(112,92,83,0.06), 0 12px 40px rgba(112,92,83,0.1)",
        }}
      >
        <div className="mb-8">
          <h1
            className={`${fraunces.className} text-[28px] font-bold text-[#000505] leading-tight`}
          >
            Welcome back
          </h1>
          <p className="text-sm text-[#705C53] mt-1.5">
            Sign in to pick up where you left off
          </p>
        </div>


        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="e.g. sarah@cafe.com"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200 text-sm"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-[#705C53] mb-1.5 uppercase tracking-[0.08em]"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200 text-sm pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C4B8AC] hover:text-[#705C53] transition-colors duration-200 cursor-pointer"
                tabIndex={-1}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-[#FFF4F0] border border-[#F5D6CC] text-[#A84C32] px-4 py-3 rounded-lg text-sm transition-all duration-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C86446] text-white py-2.5 rounded-lg font-medium hover:bg-[#B55A3E] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C86446]/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-6 text-center">
        <span className="text-sm text-[#C4B8AC]">New to the counter? </span>
        <Link
          href="/register"
          className="inline-block text-sm text-[#705C53] font-medium border-b border-[#705C53]/30 hover:text-[#C86446] hover:border-[#C86446]/30 transition-all duration-200 pb-0.5"
        >
<<<<<<< HEAD
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {(error || oauthError) && <p className="mt-4 text-red-600">{error || oauthError}</p>}
      <p className="mt-4 text-sm">
        No account?{" "}
        <Link href="/register" className="text-blue-600">
          Register
=======
          Create an account
>>>>>>> 49f8369e853180e887dd86f1b66798958469263c
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className={`${dmSans.variable} ${fraunces.variable} min-h-screen bg-[#F3EFE8] font-sans`}
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% 0%, #EDE0D4 0%, transparent 65%)",
      }}
    >
      <div className="flex items-center justify-center px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-[18px] h-[18px] rounded-full bg-[#C86446]" />
          <span
            className={`${fraunces.className} text-sm font-bold text-[#705C53] tracking-tight`}
          >
            Cafe POS
          </span>
        </div>
      </div>

      <main className="flex items-center justify-center px-6 pb-16 -mt-8 min-h-[calc(100vh-72px)]">
        <Suspense
          fallback={
            <div className="flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#705C53]" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
