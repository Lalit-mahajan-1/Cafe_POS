"use client";

import { useRef, useState } from "react";
import { Fraunces } from "next/font/google";
import {
  Camera,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Shield,
  User,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { formatRole } from "@/lib/avatar";
import { notifyProfileUpdated } from "@/lib/profile-events";

const fraunces = Fraunces({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export type ProfileUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  provider?: string;
};

type ProfileClientProps = {
  user: ProfileUser;
};

export default function ProfileClient({ user: initialUser }: ProfileClientProps) {
  const [user, setUser] = useState(initialUser);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>(
    {}
  );
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const canChangePassword = user.provider !== "google";

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError("");
    setAvatarUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setAvatarError(data.error ?? "Failed to upload image");
        return;
      }

      setUser(data.user);
      notifyProfileUpdated();
    } catch {
      setAvatarError("Failed to upload image");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const validatePassword = () => {
    const errs: Record<string, string> = {};

    if (!passwordForm.currentPassword) {
      errs.currentPassword = "Current password is required";
    }
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      errs.newPassword = "New password must be at least 6 characters";
    }
    if (!passwordForm.confirmPassword) {
      errs.confirmPassword = "Please confirm your new password";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }

    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess("");
    if (!validatePassword()) return;

    setPasswordSubmitting(true);

    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });

      const data = await res.json();

      if (!res.ok) {
        if (typeof data.error === "object") {
          const fieldErrors: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(data.error)) {
            fieldErrors[key] = (msgs as string[])[0];
          }
          setPasswordErrors(fieldErrors);
        } else {
          setPasswordErrors({ form: data.error ?? "Failed to update password" });
        }
        return;
      }

      setPasswordSuccess("Password updated successfully");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({});
    } catch {
      setPasswordErrors({ form: "Failed to update password" });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className={`${fraunces.variable}`}>
      <div className="mb-6">
        <h1
          className={`${fraunces.className} text-xl font-bold text-[#000505]`}
        >
          Profile
        </h1>
        <p className="mt-0.5 text-sm text-[#705C53]">
          Manage your account details and security
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile details */}
        <div
          className="rounded-xl bg-[#FDFBF7] p-6"
          style={{
            boxShadow:
              "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
          }}
        >
          <h2
            className={`${fraunces.className} mb-6 text-base font-bold text-[#000505]`}
          >
            Account details
          </h2>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative">
              <UserAvatar name={user.name} avatar={user.avatar} size="xl" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full bg-[#C86446] text-white shadow-md transition hover:bg-[#A84C32] disabled:opacity-60"
                aria-label="Change profile picture"
              >
                {avatarUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </div>

            <div className="flex-1 space-y-4 text-center sm:text-left">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                  Full name
                </p>
                <p className="mt-1 flex items-center justify-center gap-2 text-base font-semibold text-[#000505] sm:justify-start">
                  <User className="size-4 text-[#C86446]" />
                  {user.name}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                  Role
                </p>
                <p className="mt-1 flex items-center justify-center gap-2 text-base font-semibold text-[#000505] sm:justify-start">
                  <Shield className="size-4 text-[#C86446]" />
                  {formatRole(user.role)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                  Email
                </p>
                <p className="mt-1 flex items-center justify-center gap-2 text-base font-semibold text-[#000505] sm:justify-start">
                  <Mail className="size-4 text-[#C86446]" />
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {avatarError && (
            <p className="mt-4 text-sm text-[#A84C32]">{avatarError}</p>
          )}

          <p className="mt-4 text-xs text-[#705C53]">
            JPG, JPEG, PNG, or WebP. Your photo appears across the app.
          </p>
        </div>

        {/* Change password */}
        <div
          className="rounded-xl bg-[#FDFBF7] p-6"
          style={{
            boxShadow:
              "0 2px 4px rgba(112,92,83,0.04), 0 6px 20px rgba(112,92,83,0.06)",
          }}
        >
          <h2
            className={`${fraunces.className} mb-2 text-base font-bold text-[#000505]`}
          >
            Change password
          </h2>

          {!canChangePassword ? (
            <p className="text-sm text-[#705C53]">
              This account uses Google Sign-In and does not have a password to
              change.
            </p>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
              {passwordErrors.form && (
                <p className="text-sm text-[#A84C32]">{passwordErrors.form}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-[#2D6A2D]">{passwordSuccess}</p>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                  Current password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#705C53]" />
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] py-2.5 pl-10 pr-10 text-sm text-[#000505] transition-all duration-200 focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#705C53]"
                    aria-label={showCurrent ? "Hide password" : "Show password"}
                  >
                    {showCurrent ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="mt-1 text-xs text-[#A84C32]">
                    {passwordErrors.currentPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                  New password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#705C53]" />
                  <input
                    type={showNew ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] py-2.5 pl-10 pr-10 text-sm text-[#000505] transition-all duration-200 focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#705C53]"
                    aria-label={showNew ? "Hide password" : "Show password"}
                  >
                    {showNew ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-xs text-[#A84C32]">
                    {passwordErrors.newPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-[#705C53]">
                  Confirm new password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#705C53]" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] py-2.5 pl-10 pr-10 text-sm text-[#000505] transition-all duration-200 focus:border-[#C86446] focus:outline-none focus:ring-2 focus:ring-[#C86446]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#705C53]"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-[#A84C32]">
                    {passwordErrors.confirmPassword}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={passwordSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#C86446] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A84C32] disabled:opacity-60"
              >
                {passwordSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update password"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
