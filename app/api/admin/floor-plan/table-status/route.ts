import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { tableId, status } = body;

    if (!tableId || !status) {
      return NextResponse.json({ success: false, message: "tableId and status are required" }, { status: 400 });
    }

    const table = await prisma.table.update({
      where: { id: tableId },
      data: { status },
    });

    return NextResponse.json({ success: true, data: table, message: "Table status updated successfully" });
  } catch (error) {
    console.error("[PATCH /api/admin/floor-plan/table-status]", error);
    return NextResponse.json(
      { success: false, message: "Failed to update table status" },
      { status: 500 }
    );
  }
}
