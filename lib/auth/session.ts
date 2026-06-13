import { cookies } from "next/headers";
import { verifyToken } from "./jwt";
import { prisma } from "@/lib/prisma";

type RequestLike = {
  cookies?: {
    get(name: string): { value?: string } | undefined;
  };
  headers?: {
    get(name: string): string | null;
  };
};

const getAuthToken = async (request?: RequestLike) => {
  const authorization = request?.headers?.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  const requestCookie = request?.cookies?.get("auth-token")?.value;
  if (requestCookie) return requestCookie;

  const cookieStore = await cookies();
  return cookieStore.get("auth-token")?.value ?? null;
};

export const getCurrentUser = async (request?: RequestLike) => {
  const token = await getAuthToken(request);
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
