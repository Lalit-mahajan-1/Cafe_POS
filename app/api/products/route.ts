import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/services/product.service";
import { createProductSchema } from "@/lib/validations/product";
import { requireRole } from "@/lib/auth/session";

// GET /api/products  — list all (admin + employee can view)
export async function GET() {
  try {
    await requireRole(["ADMIN", "EMPLOYEE"]);
    const products = await productService.getAll();
    return NextResponse.json({ products, count: products.length });
  } catch (err: any) {
    const status = err.message === "UNAUTHORIZED" ? 401 : err.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

// POST /api/products  — create (admin only)
export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN"]);

    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const product = await productService.create(parsed.data);
    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (err: any) {
    const status = err.message === "UNAUTHORIZED" ? 401 : err.message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}