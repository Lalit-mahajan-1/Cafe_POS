import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/services/product.service";
import { updateProductSchema } from "@/lib/validations/product";
import { requireRole } from "@/lib/auth/session";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/products/[id]  — get one (admin + employee)
export async function GET(_: NextRequest, { params }: RouteContext) {
  try {
    await requireRole(["ADMIN", "EMPLOYEE"]);
    const { id } = await params;
    const product = await productService.getById(id);
    return NextResponse.json({ product });
  } catch (err: any) {
    const status =
      err.message === "UNAUTHORIZED" ? 401 :
      err.message === "FORBIDDEN" ? 403 :
      err.message === "Product not found" ? 404 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

// PATCH /api/products/[id]  — update (admin only)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const product = await productService.update(id, parsed.data);
    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    const status =
      err.message === "UNAUTHORIZED" ? 401 :
      err.message === "FORBIDDEN" ? 403 :
      err.message === "Product not found" ? 404 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

// DELETE /api/products/[id]  — delete (admin only)
export async function DELETE(_: NextRequest, { params }: RouteContext) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await params;
    await productService.delete(id);
    return NextResponse.json({ success: true, message: "Product deleted" });
  } catch (err: any) {
    const status =
      err.message === "UNAUTHORIZED" ? 401 :
      err.message === "FORBIDDEN" ? 403 :
      err.message === "Product not found" ? 404 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}