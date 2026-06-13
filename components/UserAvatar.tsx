"use client";

import { getAvatarUrl, getInitials } from "@/lib/avatar";

type UserAvatarProps = {
  name: string;
  avatar?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-xl",
  xl: "size-24 text-3xl",
};

export default function UserAvatar({
  name,
  avatar,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const src = getAvatarUrl(avatar);
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name}'s profile`}
        className={`rounded-full object-cover ring-2 ring-[#E6DDD1] ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-[#C86446] font-semibold text-white ring-2 ring-[#E6DDD1] ${sizeClass} ${className}`}
    >
      {getInitials(name)}
    </span>
  );
}
