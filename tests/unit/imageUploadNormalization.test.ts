import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("server-only", () => ({}));

import {
  normalizeUploadImage,
  UPLOAD_IMAGE_POLICY,
} from "@/lib/imageUploadNormalization";

describe("upload image normalization", () => {
  it("converts oversized JPEG product images to capped WebP output", async () => {
    const input = await sharp({
      create: {
        width: 1800,
        height: 1200,
        channels: 3,
        background: "#d8b36a",
      },
    })
      .jpeg()
      .toBuffer();

    const result = await normalizeUploadImage(
      input,
      "image/jpeg",
      "product-photo.jpg",
      "products"
    );
    const metadata = await sharp(result.bytes).metadata();

    expect(result.contentType).toBe("image/webp");
    expect(result.filename).toBe("product-photo.webp");
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBeLessThanOrEqual(UPLOAD_IMAGE_POLICY.products.maxWidth);
    expect(metadata.height).toBeLessThanOrEqual(UPLOAD_IMAGE_POLICY.products.maxHeight);
  });

  it("converts PNG slider images to wide capped WebP output", async () => {
    const input = await sharp({
      create: {
        width: 2600,
        height: 1600,
        channels: 4,
        background: "#528ec7",
      },
    })
      .png()
      .toBuffer();

    const result = await normalizeUploadImage(
      input,
      "image/png",
      "hero.png",
      "homepage-slider"
    );
    const metadata = await sharp(result.bytes).metadata();

    expect(result.contentType).toBe("image/webp");
    expect(result.filename).toBe("hero.webp");
    expect(metadata.width).toBeLessThanOrEqual(
      UPLOAD_IMAGE_POLICY["homepage-slider"].maxWidth
    );
    expect(metadata.height).toBeLessThanOrEqual(
      UPLOAD_IMAGE_POLICY["homepage-slider"].maxHeight
    );
  });

  it("does not enlarge small uploads", async () => {
    const input = await sharp({
      create: {
        width: 320,
        height: 240,
        channels: 3,
        background: "#f1f1f1",
      },
    })
      .jpeg()
      .toBuffer();

    const result = await normalizeUploadImage(
      input,
      "image/jpeg",
      "small.jpg",
      "products"
    );
    const metadata = await sharp(result.bytes).metadata();

    expect(metadata.width).toBe(320);
    expect(metadata.height).toBe(240);
  });

  it("keeps compliant WebP uploads as WebP without changing bytes", async () => {
    const input = await sharp({
      create: {
        width: 600,
        height: 600,
        channels: 3,
        background: "#ffffff",
      },
    })
      .webp()
      .toBuffer();

    const result = await normalizeUploadImage(
      input,
      "image/webp",
      "already.webp",
      "products"
    );

    expect(result.contentType).toBe("image/webp");
    expect(result.filename).toBe("already.webp");
    expect(result.bytes.equals(input)).toBe(true);
  });

  it("retains animated GIF input instead of flattening it", async () => {
    const input = Buffer.from("GIF89a", "ascii");

    const result = await normalizeUploadImage(
      input,
      "image/gif",
      "motion.gif",
      "products"
    );

    expect(result.contentType).toBe("image/gif");
    expect(result.filename).toBe("motion.gif");
    expect(result.bytes.equals(input)).toBe(true);
  });
});
