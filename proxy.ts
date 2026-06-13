import { NextRequest, NextResponse } from "next/server";
import { verifyTokenEdge } from "@/lib/auth/jwt-edge";

const ADMIN_ROUTES = ["/admin"];
const POS_ROUTES = ["/pos", "/kds"];
const AUTH_ROUTES = ["/login", "/register"];
const PUBLIC_ROUTES = ["/", "/about"];

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("auth-token")?.value;
  const { pathname } = req.nextUrl;

  const payload = token ? await verifyTokenEdge(token) : null;
  const isLoggedIn = payload !== null;
  const userRole = payload?.role;

  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  const isPosRoute = POS_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // ─── Block unauthenticated users from protected routes ────────
  if ((isAdminRoute || isPosRoute) && !isLoggedIn) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    if (token) response.cookies.delete("auth-token");
    return response;
  }

  // ─── Block EMPLOYEE from admin routes ─────────────────────────
  if (isAdminRoute && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/pos", req.url));
  }

  // ─── Logged-in users redirected from /login or /register ──────
  if (isAuthRoute && isLoggedIn) {
    const dest = userRole === "ADMIN" ? "/admin" : "/pos";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/pos/:path*", "/kds/:path*", "/login", "/register"],
};