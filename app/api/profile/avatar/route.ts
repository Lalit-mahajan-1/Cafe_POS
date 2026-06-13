import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { profileService } from "@/services/profile.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("avatar");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    const updatedUser = await profileService.updateAvatar(user.id, file);

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    const status = message.includes("allowed") || message.includes("MB") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
