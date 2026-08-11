import "server-only";
import path from "node:path";
import sharp, { type Metadata } from "sharp";

export type UploadImageFolder = "products" | "homepage-slider";

export const UPLOAD_IMAGE_POLICY = {
  products: {
    maxWidth: 1400,
    maxHeight: 1400,
  },
  "homepage-slider": {
    maxWidth: 1920,
    maxHeight: 1080,
  },
} as const satisfies Record<UploadImageFolder, { maxWidth: number; maxHeight: number }>;

const NORMALIZED_WEBP_QUALITY = 78;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export type NormalizedUploadImage = {
  bytes: Buffer;
  contentType: string;
  filename: string;
};

function withExtension(filename: string, extension: string) {
  const currentExtension = path.extname(filename);
  const basename = currentExtension
    ? filename.slice(0, -currentExtension.length)
    : filename;
  return `${basename || "image"}${extension}`;
}

function dimensionsFitPolicy(
  metadata: Metadata,
  policy: { maxWidth: number; maxHeight: number }
) {
  return (
    (metadata.width ?? 0) <= policy.maxWidth &&
    (metadata.height ?? 0) <= policy.maxHeight
  );
}

export async function normalizeUploadImage(
  input: Buffer,
  contentType: string,
  filename: string,
  folder: UploadImageFolder
): Promise<NormalizedUploadImage> {
  if (contentType === "image/gif") {
    // Preserve animation instead of flattening GIFs; the upload route still enforces the input size cap.
    return {
      bytes: input,
      contentType,
      filename: withExtension(filename, EXTENSION_BY_TYPE[contentType]),
    };
  }

  const policy = UPLOAD_IMAGE_POLICY[folder];
  const metadata = await sharp(input, { failOn: "none" }).metadata();
  const outputFilename = withExtension(filename, ".webp");

  if (
    contentType === "image/webp" &&
    dimensionsFitPolicy(metadata, policy)
  ) {
    return {
      bytes: input,
      contentType,
      filename: outputFilename,
    };
  }

  const bytes = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({
      width: policy.maxWidth,
      height: policy.maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: NORMALIZED_WEBP_QUALITY })
    .toBuffer();

  return {
    bytes,
    contentType: "image/webp",
    filename: outputFilename,
  };
}
