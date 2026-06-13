import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { changePasswordSchema } from "@/lib/validations/profile";
import { profileService } from "@/services/profile.service";

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await profileService.changePassword(user.id, parsed.data);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    const status =
      message === "Current password is incorrect" ||
      message.includes("Google Sign-In")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
