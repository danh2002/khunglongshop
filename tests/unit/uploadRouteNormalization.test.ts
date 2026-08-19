import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin upload route normalization wiring", () => {
  const source = readFileSync(
    resolve(process.cwd(), "app/api/admin/upload/route.ts"),
    "utf8"
  );

  it("normalizes once before both R2 and local storage branches", () => {
    const normalizeIndex = source.indexOf("await normalizeUploadImage(");
    const r2Index = source.indexOf("await r2Client.send(");
    const localWriteIndex = source.indexOf("await writeFile(");

    expect(normalizeIndex).toBeGreaterThan(-1);
    expect(r2Index).toBeGreaterThan(normalizeIndex);
    expect(localWriteIndex).toBeGreaterThan(normalizeIndex);
  });

  it("stores normalized bytes and content type in both storage modes", () => {
    expect(source).toContain("normalizedImage.bytes");
    expect(source).toContain("ContentType: normalizedImage.contentType");
    expect(source).toContain("path.join(uploadDirectory, normalizedImage.filename)");
  });

  it("keeps the stable success response shape", () => {
    expect(source).toContain("return NextResponse.json({ url })");
    expect(source).toContain("return NextResponse.json({ url: `/images/${folder}/${normalizedFilename}` })");
  });

  it("uploads public objects to the configured R2 bucket", () => {
    expect(source).toContain("new PutObjectCommand({");
    expect(source).toContain("Bucket: R2_BUCKET");
    expect(source).toContain("CacheControl: \"public, max-age=2592000\"");
    expect(source).toContain("const url = `${R2_PUBLIC_URL}/images/${folder}/${normalizedImage.filename}`");
  });
});
