import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { isExternalAvatar } from "@/lib/avatar";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Only JPEG, PNG, and WebP images are allowed";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be 5 MB or smaller";
  }
  return null;
}

export async function saveAvatarFile(file: File): Promise<string> {
  const validationError = validateAvatarFile(file);
  if (validationError) throw new Error(validationError);

  const ext = EXT_BY_MIME[file.type];
  const uuid = randomUUID();
  const filename = `${uuid}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return uuid;
}

export async function deleteLocalAvatar(avatar: string | null | undefined): Promise<void> {
  if (!avatar || isExternalAvatar(avatar)) return;

  const extensions = ["jpg", "jpeg", "png", "webp"];
  for (const ext of extensions) {
    try {
      await unlink(path.join(UPLOAD_DIR, `${avatar}.${ext}`));
      return;
    } catch {
      // try next extension
    }
  }
}

export async function findAvatarFilename(uuid: string): Promise<string | null> {
  const extensions = ["jpg", "jpeg", "png", "webp"];
  const { access } = await import("fs/promises");

  for (const ext of extensions) {
    const filename = `${uuid}.${ext}`;
    try {
      await access(path.join(UPLOAD_DIR, filename));
      return filename;
    } catch {
      // try next extension
    }
  }

  return null;
}
