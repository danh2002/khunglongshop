import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { normalizeUploadImage } from "@/lib/imageUploadNormalization";
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
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
const UPLOAD_FOLDERS = {
  products: "products",
  homepageSlider: "homepage-slider",
} as const;

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

function shouldUseR2Storage() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      R2_BUCKET &&
      R2_PUBLIC_URL
  );
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const folder = formData?.get("folder") === UPLOAD_FOLDERS.homepageSlider
    ? UPLOAD_FOLDERS.homepageSlider
    : UPLOAD_FOLDERS.products;

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

  const uploadDirectory = path.join(process.cwd(), "public", "images", folder);
  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${sanitizeFilename(file.name, file.type)}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  let normalizedFilename = filename;

  try {
    const normalizedImage = await normalizeUploadImage(
      fileBuffer,
      file.type,
      filename,
      folder
    );
    normalizedFilename = normalizedImage.filename;

    if (shouldUseR2Storage()) {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: `images/${folder}/${normalizedImage.filename}`,
          Body: normalizedImage.bytes,
          ContentType: normalizedImage.contentType,
          CacheControl: "public, max-age=2592000",
        })
      );
      const url = `${R2_PUBLIC_URL}/images/${folder}/${normalizedImage.filename}`;

      return NextResponse.json({ url });
    }

    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, normalizedImage.filename), normalizedImage.bytes);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "UPLOAD_FAILED",
          message: "Không thể lưu ảnh. Nếu đang chạy trên Vercel, hãy kết nối Vercel Blob với project.",
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: `/images/${folder}/${normalizedFilename}` });
}
