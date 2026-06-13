"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Fraunces, DM_Sans } from "next/font/google";
import {
  LayoutDashboard,
  ShoppingBag,
  Table2,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  Loader2,
  TicketPercent,
  ShieldAlert,
} from "lucide-react";

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

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Products", icon: ShoppingBag, href: "/admin/products" },
  { label: "Coupons", icon: TicketPercent, href: "/admin/coupons" },
  { label: "Tables", icon: Table2, href: "/admin/tables" },
  { label: "Orders", icon: ClipboardList, href: "/admin/orders" },
  { label: "Users", icon: Users, href: "/admin/users" },
  { label: "Settings", icon: Settings, href: "/admin/settings" },
];

type AuthState = "loading" | "ready" | "redirecting";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [statusText, setStatusText] = useState("Checking access...");

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });

        if (response.status === 401) {
          if (mounted && !retryTimer) {
            retryTimer = setTimeout(() => {
              retryTimer = null;
              void loadUser();
            }, 150);
            return;
          }

          if (!mounted) return;
          setStatusText("Redirecting to sign in...");
          setAuthState("redirecting");
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        const data = (await response.json()) as {
          user?: { name: string; role: string };
        };

        if (!data.user || data.user.role !== "ADMIN") {
          if (!mounted) return;
          setStatusText("Redirecting to employee dashboard...");
          setAuthState("redirecting");
          router.replace("/dashboard");
          return;
        }

        if (!mounted) return;
        setUser(data.user);
        setAuthState("ready");
      } catch {
        if (!mounted) return;
        setStatusText("Redirecting to sign in...");
        setAuthState("redirecting");
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    };

    void loadUser();

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      controller.abort();
    };
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  if (authState !== "ready" || !user) {
    return (
      <div
        className={`${dmSans.variable} ${fraunces.variable} min-h-screen bg-[#F3EFE8] flex items-center justify-center font-sans`}
      >
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#E8E0D8] bg-[#FDFBF7] px-6 py-8 shadow-sm">
          {authState === "loading" ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#705C53]" />
          ) : (
            <ShieldAlert className="w-6 h-6 text-[#A84C32]" />
          )}
          <p className="text-sm font-medium text-[#705C53]">{statusText}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${dmSans.variable} ${fraunces.variable} min-h-screen bg-[#F3EFE8] font-sans flex`}
    >
      <aside className="w-60 bg-[#FDFBF7] border-r border-[#E8E0D8] flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-6 h-16 border-b border-[#E8E0D8]">
          <div className="w-[18px] h-[18px] rounded-full bg-[#C86446]" />
          <span
            className={`${fraunces.className} text-sm font-bold text-[#705C53] tracking-tight`}
          >
            Cafe POS
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-[#EDE0D4] text-[#000505] font-medium"
                    : "text-[#705C53] hover:bg-[#EDE0D4] hover:text-[#000505]"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-[#C4B8AC] hover:bg-[#FFF4F0] hover:text-[#A84C32] transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#E8E0D8] bg-[#FDFBF7] flex items-center justify-between px-6 shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C86446] flex items-center justify-center text-white text-xs font-bold">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div className="text-sm">
              <p className="font-medium text-[#000505]">{user.name}</p>
              <p className="text-xs text-[#C4B8AC]">{user.role}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
