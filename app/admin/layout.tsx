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
  Coffee,
  Menu,
  X,
  UserCircle,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { PROFILE_UPDATED_EVENT } from "@/lib/profile-events";

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
  { label: "Profile", icon: UserCircle, href: "/admin/profile" },
  // { label: "Settings", icon: Settings, href: "/admin/settings" },
];

type AuthState = "loading" | "ready" | "redirecting";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{
    name: string;
    role: string;
    email: string;
    avatar?: string | null;
  } | null>(null);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [statusText, setStatusText] = useState("Checking access...");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          user?: {
            name: string;
            role: string;
            email: string;
            avatar?: string | null;
          };
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

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const refreshProfile = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (data.user) setUser(data.user);
      } catch {
        // ignore
      }
    };

    window.addEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
    return () =>
      window.removeEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
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
      className={`${dmSans.variable} ${fraunces.variable} min-h-screen bg-[#F3EFE8] font-sans`}
    >
      {/* ── Mobile Header ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-[#000505] px-4 py-3 text-white lg:hidden">
        <div className="flex items-center gap-2">
          <Coffee className="size-5" />
          <span className="font-semibold">Odoo Cafe POS</span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-md p-2 hover:bg-white/10"
        >
          <Menu className="size-6" />
        </button>
      </header>

      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed left-0 top-0 z-[60] flex h-screen w-72 flex-col
          bg-[#000505] px-4 py-5 text-[#FDFBF7]
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Mobile Close */}
        <div className="mb-2 flex justify-end lg:hidden">
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-2 hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Logo */}
        <Link
          href="/admin"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 rounded-lg px-2 py-2"
        >
          <span className="grid size-11 place-items-center rounded-lg bg-[#C86446]">
            <Coffee className="size-6" />
          </span>
          <span>
            <span className="block text-lg font-semibold leading-tight">
              Odoo Cafe POS
            </span>
            <span className="text-sm text-[#F3EFE8]/70">Admin panel</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="mt-8 space-y-1" aria-label="Admin navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${isActive
                    ? "bg-[#C86446] text-white"
                    : "text-[#F3EFE8]/75 hover:bg-[#705C53]/35 hover:text-white"
                  }`}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="mt-auto rounded-lg border border-[#705C53]/60 bg-[#705C53]/20 p-4">
          <Link
            href="/admin/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 transition hover:opacity-90"
          >
            <UserAvatar name={user.name} avatar={user.avatar} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.18em] text-[#F3EFE8]/60">
                Signed in
              </p>
              <p className="mt-1 truncate font-semibold">{user.name}</p>
              <p className="truncate text-sm text-[#F3EFE8]/65">{user.email}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#FDFBF7] px-3 py-2 text-sm font-semibold text-[#000505] transition hover:bg-[#F3EFE8]"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="lg:pl-72">
        <main className="min-h-screen p-6">{children}</main>
      </div>
    </div>
  );
}