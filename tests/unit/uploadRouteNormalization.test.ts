import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin upload route normalization wiring", () => {
  const source = readFileSync(
    resolve(process.cwd(), "app/api/admin/upload/route.ts"),
    "utf8"
  );

  it("normalizes once before both Blob and local storage branches", () => {
    const normalizeIndex = source.indexOf("await normalizeUploadImage(");
    const blobIndex = source.indexOf("await put(");
    const localWriteIndex = source.indexOf("await writeFile(");

    expect(normalizeIndex).toBeGreaterThan(-1);
    expect(blobIndex).toBeGreaterThan(normalizeIndex);
    expect(localWriteIndex).toBeGreaterThan(normalizeIndex);
  });

  it("stores normalized bytes and content type in both storage modes", () => {
    expect(source).toContain("normalizedImage.bytes");
    expect(source).toContain("contentType: normalizedImage.contentType");
    expect(source).toContain("path.join(uploadDirectory, normalizedImage.filename)");
  });

  it("keeps the stable success response shape", () => {
    expect(source).toContain("return NextResponse.json({ url: blob.url })");
    expect(source).toContain("return NextResponse.json({ url: `/images/${folder}/${normalizedFilename}` })");
  });

  it("does not assert or read a Blob token value directly", () => {
    expect(source).not.toContain("process.env.BLOB_READ_WRITE_TOKEN!");
    expect(source).not.toContain("token:");
  });
});
