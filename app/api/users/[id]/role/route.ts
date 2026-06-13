// app/api/users/[id]/role/route.ts

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

        const { role } = await req.json();

        if (!["ADMIN", "EMPLOYEE"].includes(role)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        // Find the target user
        const target = await prisma.user.findUnique({
            where: { id },
            select: { id: true, email: true, role: true, archived: true },
        });

        if (!target || target.archived) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Super admin (admin@cafe.com) cannot have their role changed by anyone
        if (target.email === SUPER_ADMIN_EMAIL) {
            return NextResponse.json(
                { error: "The super admin's role cannot be changed." },
                { status: 403 }
            );
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { role },
            select: { id: true, name: true, email: true, role: true },
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