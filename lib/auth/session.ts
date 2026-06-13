import { cookies } from "next/headers";
import { verifyToken } from "./jwt";
import { prisma } from "@/lib/prisma";

export const getCurrentUser = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      archived: true,
      avatar: true,
      createdAt: true,
    },
  });

  // Block archived users
  if (!user || user.archived) return null;

  return user;
};

// Helper: require specific role
export const requireRole = async (allowedRoles: ("ADMIN" | "EMPLOYEE")[]) => {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (!allowedRoles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
};