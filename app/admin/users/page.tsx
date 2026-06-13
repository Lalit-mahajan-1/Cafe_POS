"use client";

import { useState, useEffect } from "react";
import { Fraunces } from "next/font/google";
import { Search, UserPlus, X, Loader2, ShieldCheck, ShieldOff, KeyRound, ChevronDown } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const SUPER_ADMIN_EMAIL = "admin@cafe.com";

const roleToDisplay = { ADMIN: "ADMIN" as const, EMPLOYEE: "STAFF" as const };

const roleStyles = {
  ADMIN: "bg-[#FFF4F0] text-[#A84C32] border-[#F5D6CC]",
  STAFF: "bg-[#F0F9F0] text-[#2D6A2D] border-[#C8E6C8]",
};

type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: "ADMIN" | "STAFF";
  status: "active" | "inactive";
};

type Modal =
  | { type: "add" }
  | { type: "role"; user: User }
  | { type: "password"; user: User }
  | null;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [pageLoading, setPageLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [search, setSearch] = useState("");

  // Add user form
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "STAFF" as "ADMIN" | "STAFF" });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Role change
  const [confirmText, setConfirmText] = useState("");
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleError, setRoleError] = useState("");

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ])
      .then(([userData, meData]) => {
        const mapped: User[] = (userData.users || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          avatar: u.avatar,
          role: roleToDisplay[u.role as "ADMIN" | "EMPLOYEE"] || "STAFF",
          status: "active",
        }));
        setUsers(mapped);
        setCurrentUserEmail(meData?.user?.email || meData?.email || "");
      })
      .catch(() => setUsers([]))
      .finally(() => setPageLoading(false));
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const isSuperAdmin = currentUserEmail === SUPER_ADMIN_EMAIL;

  const canChangeRole = (user: User) => {
    if (user.email === SUPER_ADMIN_EMAIL) return false; // super admin is untouchable
    return true;
  };

  const canChangePassword = (user: User) => {
    if (isSuperAdmin) return true; // super admin can change anyone's password
    if (user.role === "ADMIN") return false; // regular admin cannot change another admin's password
    return true;
  };

  // ── Add user ──────────────────────────────────────────────────────────────
  const validateAdd = () => {
    const errs: Record<string, string> = {};
    if (!addForm.name.trim() || addForm.name.trim().length < 2)
      errs.name = "Name must be at least 2 characters";
    if (!addForm.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email))
      errs.email = "Invalid email address";
    if (!addForm.password || addForm.password.length < 6)
      errs.password = "Password must be at least 6 characters";
    setAddErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAdd()) return;
    setAddSubmitting(true);
    try {
      const roleToDb = { ADMIN: "ADMIN", STAFF: "EMPLOYEE" };
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          password: addForm.password,
          role: roleToDb[addForm.role],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.error === "object") {
          const fieldErrors: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(data.error))
            fieldErrors[key] = (msgs as string[])[0];
          setAddErrors(fieldErrors);
        } else {
          setAddErrors({ form: data.error || "Failed to create user" });
        }
        return;
      }
      const newUser: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: roleToDisplay[data.user.role as "ADMIN" | "EMPLOYEE"],
        status: "active",
      };
      setUsers((prev) => [...prev, newUser]);
      setModal(null);
      resetAddForm();
    } catch {
      setAddErrors({ form: "Network error. Please try again." });
    } finally {
      setAddSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setAddForm({ name: "", email: "", password: "", role: "STAFF" });
    setAddErrors({});
  };

  // ── Role change ───────────────────────────────────────────────────────────
  const handleRoleChange = async () => {
    if (!modal || modal.type !== "role") return;
    if (confirmText !== "CONFIRM") {
      setRoleError('Type "CONFIRM" to proceed.');
      return;
    }
    setRoleSubmitting(true);
    setRoleError("");
    const target = modal.user;
    const newRole = target.role === "ADMIN" ? "EMPLOYEE" : "ADMIN";
    try {
      const res = await fetch(`/api/users/${target.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) { setRoleError(data.error || "Failed to update role"); return; }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id
            ? { ...u, role: roleToDisplay[data.user.role as "ADMIN" | "EMPLOYEE"] }
            : u
        )
      );
      setModal(null);
      setConfirmText("");
    } catch {
      setRoleError("Network error. Please try again.");
    } finally {
      setRoleSubmitting(false);
    }
  };

  // ── Password change ───────────────────────────────────────────────────────
  const handlePasswordChange = async () => {
    if (!modal || modal.type !== "password") return;
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    setPasswordSubmitting(true);
    setPasswordError("");
    const target = modal.user;
    try {
      const res = await fetch(`/api/users/${target.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPasswordError(data.error || "Failed to update password"); return; }
      setModal(null);
      setNewPassword("");
    } catch {
      setPasswordError("Network error. Please try again.");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const closeModal = () => {
    setModal(null);
    setConfirmText("");
    setRoleError("");
    setNewPassword("");
    setPasswordError("");
    resetAddForm();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`${fraunces.className} text-xl font-bold text-[#000505]`}>Users</h1>
          <p className="text-sm text-[#705C53] mt-0.5">Manage staff accounts</p>
        </div>
        <button
          onClick={() => { resetAddForm(); setModal({ type: "add" }); }}
          className="flex items-center gap-2 bg-[#C86446] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Search */}
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

      {/* Table */}
      <div
        className="bg-[#FDFBF7] rounded-xl overflow-hidden"
        style={{ boxShadow: "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)" }}
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
                <th className="text-left px-5 py-3 text-xs font-medium text-[#C4B8AC] uppercase tracking-[0.08em]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.email} className="border-b border-[#E8E0D8] last:border-0 hover:bg-[#F3EFE8]/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <UserAvatar name={user.name} avatar={user.avatar} size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#C86446] flex items-center justify-center text-white text-xs font-bold">
                          {user.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                      )}
                      <span className="text-sm font-medium text-[#000505]">{user.name}</span>
                      {user.email === SUPER_ADMIN_EMAIL && (
                        <span className="text-[10px] font-semibold bg-[#FFF4F0] text-[#A84C32] border border-[#F5D6CC] px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          Super
                        </span>
                      )}
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
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {canChangeRole(user) && (
                        <button
                          onClick={() => { setConfirmText(""); setRoleError(""); setModal({ type: "role", user }); }}
                          title={user.role === "ADMIN" ? "Demote to Staff" : "Promote to Admin"}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[#E8E0D8] text-[#705C53] hover:border-[#C86446] hover:text-[#C86446] transition-all duration-200 cursor-pointer"
                        >
                          {user.role === "ADMIN" ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          {user.role === "ADMIN" ? "Demote" : "Promote"}
                        </button>
                      )}
                      {canChangePassword(user) && (
                        <button
                          onClick={() => { setNewPassword(""); setPasswordError(""); setModal({ type: "password", user }); }}
                          title="Change Password"
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[#E8E0D8] text-[#705C53] hover:border-[#C86446] hover:text-[#C86446] transition-all duration-200 cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          Password
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modals ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closeModal}>
          <div className="fixed inset-0 bg-[#000505]/40 backdrop-blur-sm" />
          <div
            className="relative bg-[#FDFBF7] rounded-xl w-full max-w-lg mx-4 p-6"
            style={{ boxShadow: "0 4px 8px rgba(112,92,83,0.08), 0 12px 40px rgba(112,92,83,0.12)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Add User Modal ── */}
            {modal.type === "add" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`${fraunces.className} text-lg font-bold text-[#000505]`}>Add User</h2>
                  <button onClick={closeModal} disabled={addSubmitting} className="text-[#C4B8AC] hover:text-[#705C53] transition-colors cursor-pointer disabled:opacity-50">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddSubmit} className="space-y-4">
                  {addErrors.form && (
                    <div className="bg-[#FFF4F0] border border-[#F5D6CC] rounded-lg px-4 py-2.5 text-sm text-[#A84C32]">{addErrors.form}</div>
                  )}
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">Name</label>
                    <input type="text" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                      placeholder="e.g. John Doe" />
                    {addErrors.name && <p className="mt-1 text-xs text-[#A84C32]">{addErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">Email</label>
                    <input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                      placeholder="e.g. john@cafe.com" />
                    {addErrors.email && <p className="mt-1 text-xs text-[#A84C32]">{addErrors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">Password</label>
                    <input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                      placeholder="Min. 6 characters" />
                    {addErrors.password && <p className="mt-1 text-xs text-[#A84C32]">{addErrors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">Role</label>
                    <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value as "ADMIN" | "STAFF" })}
                      className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200 appearance-none">
                      <option value="STAFF">Staff</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button type="button" onClick={closeModal} disabled={addSubmitting}
                      className="flex-1 px-4 py-2.5 border border-[#E8E0D8] text-[#705C53] rounded-lg text-sm font-medium hover:bg-[#F3EFE8] transition-all duration-200 cursor-pointer disabled:opacity-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={addSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#C86446] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer disabled:opacity-50">
                      {addSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" />Creating...</>) : "Create User"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── Role Change Modal ── */}
            {modal.type === "role" && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className={`${fraunces.className} text-lg font-bold text-[#000505]`}>
                    {modal.user.role === "ADMIN" ? "Demote to Staff" : "Promote to Admin"}
                  </h2>
                  <button onClick={closeModal} disabled={roleSubmitting} className="text-[#C4B8AC] hover:text-[#705C53] transition-colors cursor-pointer disabled:opacity-50">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-[#FFF4F0] border border-[#F5D6CC] rounded-lg px-4 py-3 mb-5">
                  <p className="text-sm text-[#A84C32]">
                    You are about to change <span className="font-semibold">{modal.user.name}</span>'s role from{" "}
                    <span className="font-semibold">{modal.user.role}</span> to{" "}
                    <span className="font-semibold">{modal.user.role === "ADMIN" ? "STAFF" : "ADMIN"}</span>.
                    This will immediately affect their access.
                  </p>
                </div>

                <div className="mb-5">
                  <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">
                    Type <span className="font-bold text-[#000505]">CONFIRM</span> to proceed
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => { setConfirmText(e.target.value); setRoleError(""); }}
                    className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200 font-mono"
                    placeholder="CONFIRM"
                  />
                  {roleError && <p className="mt-1 text-xs text-[#A84C32]">{roleError}</p>}
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={closeModal} disabled={roleSubmitting}
                    className="flex-1 px-4 py-2.5 border border-[#E8E0D8] text-[#705C53] rounded-lg text-sm font-medium hover:bg-[#F3EFE8] transition-all duration-200 cursor-pointer disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={handleRoleChange} disabled={roleSubmitting || confirmText !== "CONFIRM"}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#C86446] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    {roleSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" />Updating...</>) : "Confirm Change"}
                  </button>
                </div>
              </>
            )}

            {/* ── Password Change Modal ── */}
            {modal.type === "password" && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className={`${fraunces.className} text-lg font-bold text-[#000505]`}>Change Password</h2>
                  <button onClick={closeModal} disabled={passwordSubmitting} className="text-[#C4B8AC] hover:text-[#705C53] transition-colors cursor-pointer disabled:opacity-50">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-[#705C53] mb-5">
                  Set a new password for <span className="font-semibold text-[#000505]">{modal.user.name}</span>.
                </p>

                <div className="mb-5">
                  <label className="block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53] mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                    className="w-full px-3.5 py-2.5 bg-[#FDFBF7] border border-[#E8E0D8] rounded-lg text-sm text-[#000505] placeholder:text-[#C4B8AC] focus:outline-none focus:border-[#C86446] focus:ring-2 focus:ring-[#C86446]/15 transition-all duration-200"
                    placeholder="Min. 6 characters"
                    autoFocus
                  />
                  {passwordError && <p className="mt-1 text-xs text-[#A84C32]">{passwordError}</p>}
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={closeModal} disabled={passwordSubmitting}
                    className="flex-1 px-4 py-2.5 border border-[#E8E0D8] text-[#705C53] rounded-lg text-sm font-medium hover:bg-[#F3EFE8] transition-all duration-200 cursor-pointer disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={handlePasswordChange} disabled={passwordSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#C86446] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#B55A3E] transition-all duration-200 cursor-pointer disabled:opacity-50">
                    {passwordSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" />Saving...</>) : "Save Password"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}