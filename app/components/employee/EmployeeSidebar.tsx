"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChefHat,
  Coffee,
  CreditCard,
  LayoutDashboard,
  LogOut,
  QrCode,
  ReceiptText,
  Users,
} from "lucide-react";

type EmployeeSidebarProps = {
  userName: string;
  userEmail: string;
};

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "POS Terminal", href: "/pos", icon: ReceiptText },
  { label: "Kitchen Display", href: "/kds", icon: ChefHat },
  { label: "Table Seats", href: "/book-seat", icon: Users },
  { label: "QR Menu", href: "/generate-qr", icon: QrCode },
  { label: "Payments", href: "/dashboard#payments", icon: CreditCard },
];

export default function EmployeeSidebar({
  userName,
  userEmail,
}: EmployeeSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="flex min-h-screen w-full flex-col bg-[#000505] px-4 py-5 text-[#FDFBF7] lg:fixed lg:left-0 lg:top-0 lg:w-72">
      <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-2 py-2">
        <span className="grid size-11 place-items-center rounded-lg bg-[#C86446]">
          <Coffee className="size-6" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-lg font-semibold leading-tight">Odoo Cafe POS</span>
          <span className="text-sm text-[#F3EFE8]/70">Employee station</span>
        </span>
      </Link>

      <nav className="mt-8 space-y-1" aria-label="Employee dashboard navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href.split("#")[0];

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-[#C86446] text-white"
                  : "text-[#F3EFE8]/75 hover:bg-[#705C53]/35 hover:text-white"
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg border border-[#705C53]/60 bg-[#705C53]/20 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[#F3EFE8]/60">Signed in</p>
        <p className="mt-2 truncate font-semibold">{userName}</p>
        <p className="truncate text-sm text-[#F3EFE8]/65">{userEmail}</p>
        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#FDFBF7] px-3 py-2 text-sm font-semibold text-[#000505] transition hover:bg-[#F3EFE8]"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Logout
        </button>
      </div>
    </aside>
  );
}
