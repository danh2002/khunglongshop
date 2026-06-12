import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/utils/adminAuth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function sanitizeFilename(filename: string, mimeType: string) {
  const originalExtension = path.extname(filename).toLowerCase();
  const extension =
    mimeType === "image/jpeg" && (originalExtension === ".jpg" || originalExtension === ".jpeg")
      ? originalExtension
      : EXTENSION_BY_TYPE[mimeType];
  const basename = path
    .basename(filename, extension)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${basename || "product"}${extension}`;
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: { code: "FILE_REQUIRED", message: "Vui lòng chọn ảnh để tải lên" } },
      { status: 400 }
    );
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: { code: "INVALID_FILE_TYPE", message: "Chỉ hỗ trợ JPG, PNG, WEBP hoặc GIF" } },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: { code: "FILE_TOO_LARGE", message: "Ảnh không được vượt quá 5MB" } },
      { status: 400 }
    );
  }

  const uploadDirectory = path.join(process.cwd(), "public", "images", "products");
  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${sanitizeFilename(file.name, file.type)}`;

  try {
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, filename), Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json(
      { error: { code: "UPLOAD_FAILED", message: "Không thể lưu ảnh" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: `/images/products/${filename}` });
}
