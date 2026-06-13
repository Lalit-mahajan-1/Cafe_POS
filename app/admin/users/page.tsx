"use client";

import { useState, useEffect } from "react";
import { Fraunces } from "next/font/google";
import { Search, UserPlus, X, Loader2 } from "lucide-react";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const roleToDisplay = { ADMIN: "ADMIN" as const, EMPLOYEE: "STAFF" as const };

const roleStyles = {
  ADMIN: "bg-[#FFF4F0] text-[#A84C32] border-[#F5D6CC]",
  STAFF: "bg-[#F0F9F0] text-[#2D6A2D] border-[#C8E6C8]",
};

type User = {
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  status: "active" | "inactive";
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STAFF" as "ADMIN" | "STAFF",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        const mapped: User[] = (data.users || []).map((u: { name: string; email: string; role: string }) => ({
          name: u.name,
          email: u.email,
          role: roleToDisplay[u.role as "ADMIN" | "EMPLOYEE"] || "STAFF",
          status: "active",
        }));
        setUsers(mapped);
      })
      .catch(() => setUsers([]))
      .finally(() => setPageLoading(false));
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = "Name must be at least 2 characters";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Invalid email address";
    if (!form.password || form.password.length < 6)
      errs.password = "Password must be at least 6 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const roleToDb = { ADMIN: "ADMIN" as const, STAFF: "EMPLOYEE" as const };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: roleToDb[form.role],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (typeof data.error === "object") {
          const fieldErrors: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(data.error)) {
            fieldErrors[key] = (msgs as string[])[0];
          }
          setErrors(fieldErrors);
        } else {
          setErrors({ form: data.error || "Failed to create user" });
        }
        return;
      }

      const newUser: User = {
        name: data.user.name,
        email: data.user.email,
        role: roleToDisplay[data.user.role as "ADMIN" | "EMPLOYEE"],
        status: "active",
      };
      setUsers((prev) => [...prev, newUser]);
      setShowModal(false);
      resetForm();
    } catch {
      setErrors({ form: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ name: "", email: "", password: "", role: "STAFF" });
    setErrors({});
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className={`${fraunces.className} text-xl font-bold text-[#000505]`}
          >
            Users
          </h1>
          <p className="text-sm text-[#705C53] mt-0.5">
            Manage staff accounts
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-[#C86446] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C4B8AC]" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
        />
      </div>

      <div
        className="bg-[#FDFBF7] rounded-xl overflow-hidden"
        style={{
          boxShadow:
            "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
        }}
      >
        {pageLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-[#C4B8AC]" />
          </div>
        ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E0D8]">
              <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Name</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Email</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Role</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.email} className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#F3EFE8]/50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#C86446] flex items-center justify-center text-white text-xs font-bold">
                      {user.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <span className="text-sm font-medium text-[#000505]">{user.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-[#705C53]">{user.email}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${roleStyles[user.role]}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-sm ${user.status === "active" ? "text-green-600" : "text-[#C4B8AC]"}`}>
                    {user.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => !submitting && setShowModal(false)}
        >
          <div className="fixed inset-0 bg-[#000505]/40 backdrop-blur-sm" />
          <div
            className="relative bg-[#FDFBF7] rounded-xl w-full max-w-lg mx-4 p-6"
            style={{
              boxShadow:
                "0 4px 8px rgba(112,92,83,0.08), 0 12px 40px rgba(112,92,83,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className={`${fraunces.className} text-lg font-bold text-[#000505]`}
              >
                Add User
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                disabled={submitting}
                className="text-[#C4B8AC] hover:text-[#705C53] transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.form && (
                <div className="bg-[#FFF4F0] border border-[#F5D6CC] rounded-lg px-4 py-2.5 text-sm text-[#A84C32]">
                  {errors.form}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                  placeholder="e.g. John Doe"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-[#A84C32]">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                  placeholder="e.g. john@cafe.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-[#A84C32]">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                  placeholder="Min. 6 characters"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-[#A84C32]">
                    {errors.password}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value as "ADMIN" | "STAFF",
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200 appearance-none"
                >
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 border border-[#E8E0D8] text-[#705C53] rounded-lg text-sm font-medium hover:bg-[#F3EFE8] transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#C86446] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create User"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
