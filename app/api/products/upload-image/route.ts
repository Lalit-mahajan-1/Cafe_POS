// app/api/products/upload-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs"; // needed for fs access

const ALLOWED_TYPES: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
};

const MAX_SIZE = 4 * 1024 * 1024; // 4 MB

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const name = (formData.get("name") as string | null)?.trim();

        if (!file) {
            return NextResponse.json({ error: "No file provided." }, { status: 400 });
        }
        if (!name) {
            return NextResponse.json({ error: "Product name is required." }, { status: 400 });
        }

        // Validate MIME type
        const ext = ALLOWED_TYPES[file.type];
        if (!ext) {
            return NextResponse.json(
                { error: "Only JPG, PNG, or WebP images are allowed." },
                { status: 400 }
            );
        }

        // Validate size
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: "Image must be smaller than 4 MB." },
                { status: 400 }
            );
        }

        // Build filename: spaces → underscores, match existing convention
        // e.g. "Blueberry Muffin" → "Blueberry_Muffin.png"
        const safeName = name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-]/g, "");
        const filename = `${safeName}${ext}`;

        // Destination: <project_root>/public/products/<filename>
        const destDir = path.join(process.cwd(), "public", "products");
        await fs.mkdir(destDir, { recursive: true });

        const destPath = path.join(destDir, filename);
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(destPath, buffer);

        // Return the public path that goes into the DB
        return NextResponse.json({ path: `/products/${filename}` }, { status: 200 });
    } catch (err) {
        console.error("[upload-image]", err);
        return NextResponse.json({ error: "Upload failed." }, { status: 500 });
    }
}