import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { RegisterInput, LoginInput } from "@/lib/validations/auth";
import { GoogleUserInfo } from "@/lib/auth/google";

export const authService = {
  async register(data: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error("Email already registered");

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: { ...data, password: hashedPassword, provider: "credentials" },
      select: { id: true, name: true, email: true },
    });

    const token = signToken({ userId: user.id, email: user.email });
    return { user, token };
  },

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.password) throw new Error("Invalid credentials");

    const isValid = await verifyPassword(data.password, user.password);
    if (!isValid) throw new Error("Invalid credentials");

    const token = signToken({ userId: user.id, email: user.email });
    return {
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  },

  // ─── NEW ────────────────────────────────────────────────────
  async loginWithGoogle(googleUser: GoogleUserInfo) {
    // Try to find user by googleId first, then by email
    let user = await prisma.user.findUnique({ where: { googleId: googleUser.id } });

    if (!user) {
      // Maybe they registered with email before — link the accounts
      const existingByEmail = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (existingByEmail) {
        user = await prisma.user.update({
          where: { email: googleUser.email },
          data: {
            googleId: googleUser.id,
            avatar: googleUser.picture,
          },
        });
      } else {
        // Brand new user — create account
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name,
            googleId: googleUser.id,
            avatar: googleUser.picture,
            provider: "google",
          },
        });
      }
    }

    const token = signToken({ userId: user.id, email: user.email });
    return {
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  },
};