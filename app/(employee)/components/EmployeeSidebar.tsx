"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChefHat,
  Coffee,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  UserCircle,
  Users,
  Menu,
  X,
  History,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { PROFILE_UPDATED_EVENT } from "@/lib/profile-events";

type EmployeeSidebarProps = {
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
};

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "POS Terminal", href: "/pos", icon: ReceiptText },
  { label: "Kitchen Display", href: "/kds", icon: ChefHat },
  { label: "Table Seats", href: "/book-seat", icon: Users },
  { label: "Orders History", href: "/orders", icon: History },
  { label: "Profile", href: "/profile", icon: UserCircle },
];

export default function EmployeeSidebar({
  userName,
  userEmail,
  userAvatar: initialAvatar,
}: EmployeeSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [userNameState, setUserNameState] = useState(userName);
  const [userEmailState, setUserEmailState] = useState(userEmail);
  const [userAvatar, setUserAvatar] = useState(initialAvatar ?? null);

  useEffect(() => {
    setUserNameState(userName);
    setUserEmailState(userEmail);
    setUserAvatar(initialAvatar ?? null);
  }, [userName, userEmail, initialAvatar]);

  useEffect(() => {
    const refreshProfile = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.user) {
          setUserNameState(data.user.name);
          setUserEmailState(data.user.email);
          setUserAvatar(data.user.avatar ?? null);
        }
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

  return (
    <>
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-[#000505] px-4 py-3 text-white lg:hidden">
        <div className="flex items-center gap-2">
          <Coffee className="size-5" />
          <span className="font-semibold">Odoo Cafe POS</span>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md p-2 hover:bg-white/10"
        >
          <Menu className="size-6" />
        </button>
      </header>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-[60] flex h-screen w-72 flex-col
          bg-[#000505] px-4 py-5 text-[#FDFBF7]
          transform transition-transform duration-300 ease-in-out

          ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }

          lg:translate-x-0
        `}
      >
        {/* Mobile Close Button */}
        <div className="mb-2 flex justify-end lg:hidden">
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-md p-2 hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Logo */}
        <Link
          href="/dashboard"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 rounded-lg px-2 py-2"
        >
          <span className="grid size-11 place-items-center rounded-lg bg-[#C86446]">
            <Coffee className="size-6" />
          </span>

          <span>
            <span className="block text-lg font-semibold leading-tight">
              Odoo Cafe POS
            </span>
            <span className="text-sm text-[#F3EFE8]/70">
              Employee station
            </span>
          </span>
        </Link>

        {/* Navigation */}
        <nav
          className="mt-8 space-y-1"
          aria-label="Employee dashboard navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                  isActive
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
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 transition hover:opacity-90"
          >
            <UserAvatar name={userNameState} avatar={userAvatar} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{userNameState}</p>
              <p className="truncate text-sm text-[#F3EFE8]/65">
                {userEmailState}
              </p>
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
    </>
  );
}
