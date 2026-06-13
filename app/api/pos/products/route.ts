import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const cafeColors = ["#705C53", "#C86446", "#000505", "#8A6F61", "#B85D42"];

async function getOrCreateCategory(name: string) {
  const normalizedName = name.trim();

  return prisma.category.upsert({
    where: { name: normalizedName },
    update: {},
    create: {
      name: normalizedName,
      color: cafeColors[normalizedName.length % cafeColors.length],
    },
  });
}

export async function GET() {
  try {
    await requireRole(["ADMIN", "EMPLOYEE"]);

    const products = await prisma.product.findMany({
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      include: { category: true },
    });

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ products, categories });
  } catch {
    return NextResponse.json({ error: "Unable to load products" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "EMPLOYEE"]);
    const body = await req.json();

    const name = String(body.name || "").trim();
    const categoryName = String(body.category || "").trim();
    const price = Number(body.price);
    const unit = String(body.unit || "piece").trim();
    const tax = Number(body.tax || 0);
    const description = body.description ? String(body.description).trim() : null;

    if (!name || !categoryName || Number.isNaN(price) || price < 0) {
      return NextResponse.json({ error: "Name, category, and valid price are required" }, { status: 400 });
    }

    const category = await getOrCreateCategory(categoryName);
    const product = await prisma.product.create({
      data: {
        name,
        price,
        unit,
        tax: Number.isNaN(tax) ? 0 : tax,
        description,
        categoryId: category.id,
      },
      include: { category: true },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create product" }, { status: 500 });
  }
}
