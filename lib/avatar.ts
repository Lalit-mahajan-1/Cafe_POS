/** Returns initials from a display name (first letter of each word). */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function isExternalAvatar(avatar: string | null | undefined): boolean {
  if (!avatar) return false;
  return avatar.startsWith("http://") || avatar.startsWith("https://");
}

/** Resolve a stored avatar value to a public URL, or null when using initials. */
export function getAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  if (isExternalAvatar(avatar)) return avatar;
  return `/api/avatars/${avatar}`;
}

export function formatRole(role: string): string {
  if (role === "EMPLOYEE") return "Employee";
  if (role === "ADMIN") return "Admin";
  return role;
}
