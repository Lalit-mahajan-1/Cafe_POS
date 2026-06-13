import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { RegisterInput, LoginInput } from "@/lib/validations/auth";
import { GoogleUserInfo } from "@/lib/auth/google";

export const authService = {
  async register(data: RegisterInput) {
    // ── Check duplicate ────────────────────────────────────────────────────
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) throw new Error("Email already registered");

    // ── Create user ────────────────────────────────────────────────────────
    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        password: hashedPassword,
        provider: "credentials",
        role: "EMPLOYEE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, token };
  },

  async login(data: LoginInput) {
    // ── Find user ──────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (!user) throw new Error("Invalid email or password");
    if (!user.password) throw new Error("This account uses Google Sign-In. Please login with Google.");
    if (user.archived) throw new Error("Account is deactivated. Contact admin.");

    // ── Verify password ────────────────────────────────────────────────────
    const isValid = await verifyPassword(data.password, user.password);
    if (!isValid) throw new Error("Invalid email or password");

    // ── Sign token ─────────────────────────────────────────────────────────
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    };
  },

  async loginWithGoogle(googleUser: GoogleUserInfo) {
    // ── Find by Google ID first ────────────────────────────────────────────
    let user = await prisma.user.findUnique({
      where: { googleId: googleUser.id },
    });

    if (!user) {
      // ── Check if email already exists ──────────────────────────────────
      const existingByEmail = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (existingByEmail) {
        // Link Google to existing account
        user = await prisma.user.update({
          where: { email: googleUser.email },
          data: {
            googleId: googleUser.id,
            avatar: googleUser.picture,
            provider: "google",
          },
        });
      } else {
        // New Google user defaults to EMPLOYEE for safer public signup flow
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name,
            googleId: googleUser.id,
            avatar: googleUser.picture,
            provider: "google",
            role: "EMPLOYEE",
          },
        });
      }
    }

    if (user.archived) throw new Error("Account is deactivated. Contact admin.");

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    };
  },
};
