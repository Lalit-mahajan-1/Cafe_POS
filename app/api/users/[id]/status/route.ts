// app/api/users/[id]/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";

const SUPER_ADMIN_EMAIL = "admin@cafe.com";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await requireRole(["ADMIN"]);
        const { id } = await params;

        const { archived } = await req.json();

        if (typeof archived !== "boolean") {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        // Find the target user
        const target = await prisma.user.findUnique({
            where: { id },
            select: { id: true, email: true, role: true },
        });

        if (!target) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Super admin can never be deactivated
        if (target.email === SUPER_ADMIN_EMAIL) {
            return NextResponse.json(
                { error: "The super admin account cannot be deactivated." },
                { status: 403 }
            );
        }

        const isSuperAdmin = currentUser.email === SUPER_ADMIN_EMAIL;

        // Regular admins can only toggle employees, not other admins
        if (!isSuperAdmin && target.role === "ADMIN") {
            return NextResponse.json(
                { error: "You do not have permission to change an admin's status." },
                { status: 403 }
            );
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { archived },
            select: { id: true, name: true, email: true, archived: true },
        });

        return NextResponse.json({ success: true, user: updated });
    } catch (err: any) {
        const status =
            err.message === "UNAUTHORIZED"
                ? 401
                : err.message === "FORBIDDEN"
                    ? 403
                    : 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}