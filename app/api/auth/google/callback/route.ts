import { NextRequest, NextResponse } from "next/server";
import { getGoogleAccessToken, getGoogleUserInfo } from "@/lib/auth/google";
import { authService } from "@/services/auth.service";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/login?error=google_denied", req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", req.url));
  }

  try {
    const accessToken = await getGoogleAccessToken(code);
    const googleUser = await getGoogleUserInfo(accessToken);

    const { token } = await authService.loginWithGoogle(googleUser);

    const response = NextResponse.redirect(new URL("/dashboard", req.url));
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
  }
}