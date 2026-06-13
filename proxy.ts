import { NextRequest, NextResponse } from "next/server";
import { verifyTokenEdge } from "@/lib/auth/jwt-edge";

const ADMIN_ROUTES = ["/admin"];
const EMPLOYEE_ROUTES = ["/dashboard", "/pos", "/kds", "/profile", "/book-seat"];
const AUTH_ROUTES = ["/login", "/register"];

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("auth-token")?.value;
  const { pathname } = req.nextUrl;

  const payload = token ? await verifyTokenEdge(token) : null;
  const isLoggedIn = payload !== null;
  const userRole = payload?.role;

  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  const isEmployeeRoute = EMPLOYEE_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if ((isAdminRoute || isEmployeeRoute) && !isLoggedIn) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    if (token) response.cookies.delete("auth-token");
    return response;
  }

  if (isAdminRoute && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isAuthRoute && isLoggedIn) {
    const dest = userRole === "ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/pos/:path*",
    "/kds/:path*",
    "/profile/:path*",
    "/book-seat/:path*",
    "/login",
    "/register",
  ],
};
