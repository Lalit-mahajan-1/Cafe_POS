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
      data: {
        ...data,
        password: hashedPassword,
        provider: "credentials",
        role: "Customer", // First-time signup = ADMIN (per spec)
      },
      select: { id: true, name: true, email: true, role: true },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    return { user, token };
  },

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.password) throw new Error("Invalid credentials");
    if (user.archived) throw new Error("Account is archived. Contact admin.");

    const isValid = await verifyPassword(data.password, user.password);
    if (!isValid) throw new Error("Invalid credentials");

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    };
  },

  async loginWithGoogle(googleUser: GoogleUserInfo) {
    let user = await prisma.user.findUnique({ where: { googleId: googleUser.id } });

    if (!user) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (existingByEmail) {
        user = await prisma.user.update({
          where: { email: googleUser.email },
          data: { googleId: googleUser.id, avatar: googleUser.picture },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name,
            googleId: googleUser.id,
            avatar: googleUser.picture,
            provider: "google",
            role: "ADMIN", // First Google login = ADMIN
          },
        });
      }
    }

    if (user.archived) throw new Error("Account is archived");

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    };
  },
};