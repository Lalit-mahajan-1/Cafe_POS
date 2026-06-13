// app/api/users/[id]/password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { requireRole, getCurrentUser } from "@/lib/auth/session";

const SUPER_ADMIN_EMAIL = "admin@cafe.com";

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const currentUser = await requireRole(["ADMIN"]);

        const { password } = await req.json();

        if (!password || password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        // Find the target user
        const target = await prisma.user.findUnique({
            where: { id: params.id },
            select: { id: true, email: true, role: true, archived: true },
        });

        if (!target || target.archived) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const isSuperAdmin = currentUser.email === SUPER_ADMIN_EMAIL;

        // A regular admin cannot change another admin's password
        // (only the super admin can change any admin's password)
        if (!isSuperAdmin && target.role === "ADMIN") {
            return NextResponse.json(
                { error: "You do not have permission to change an admin's password." },
                { status: 403 }
            );
        }

        const hashed = await hashPassword(password);

        await prisma.user.update({
            where: { id: params.id },
            data: { password: hashed },
        });

        return NextResponse.json({ success: true });
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