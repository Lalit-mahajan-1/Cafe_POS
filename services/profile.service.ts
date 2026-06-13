import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { deleteLocalAvatar, saveAvatarFile } from "@/lib/uploads/avatar-storage";
import { ChangePasswordInput } from "@/lib/validations/profile";

export const profileService = {
  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, provider: true },
    });

    if (!user) throw new Error("User not found");
    if (!user.password) {
      throw new Error(
        "This account uses Google Sign-In and has no password to change"
      );
    }

    const isValid = await verifyPassword(data.currentPassword, user.password);
    if (!isValid) throw new Error("Current password is incorrect");

    const hashedPassword = await hashPassword(data.newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  },

  async updateAvatar(userId: string, file: File) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (!user) throw new Error("User not found");

    const uuid = await saveAvatarFile(file);

    await deleteLocalAvatar(user.avatar);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatar: uuid },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        provider: true,
        createdAt: true,
      },
    });

    return updated;
  },
};
