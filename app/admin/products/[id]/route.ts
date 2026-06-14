import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/services/product.service";
import { updateProductSchema } from "@/lib/validations/product";

export async function GET(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const product = await productService.getById(params.id);
        return NextResponse.json({ product });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: message === "Product not found" ? 404 : 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await req.json();
        const parsed = updateProductSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.flatten().fieldErrors },
                { status: 422 }
            );
        }

        const product = await productService.update(params.id, parsed.data);
        return NextResponse.json({ product });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: message === "Product not found" ? 404 : 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await productService.delete(params.id);
        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: message === "Product not found" ? 404 : 500 });
    }
}