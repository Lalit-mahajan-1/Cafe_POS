import { NextRequest, NextResponse } from "next/server";
import { mailService } from "@/services/mail.service";
import { sendMailSchema } from "@/lib/validations/mail";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    // Require login (prevents spam abuse)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = sendMailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await mailService.sendMail(parsed.data);

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      ...result,
    });
  } catch (err: any) {
    console.error("Send mail error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to send email" },
      { status: 500 }
    );
  }
}