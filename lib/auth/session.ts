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
    select: { id: true, name: true, email: true, createdAt: true, avatar: true },
  });

  return user; // returns null if user deleted, that's fine
};