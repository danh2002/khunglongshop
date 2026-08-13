import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Next image optimizer configuration", () => {
  const source = readFileSync(resolve(process.cwd(), "next.config.mjs"), "utf8");

  it("uses the safe image width sets accepted by Vercel image optimization", () => {
    expect(source).toContain("deviceSizes: [640, 750, 828, 1080, 1200, 1920]");
    expect(source).toContain(
      "imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]"
    );
    expect(source).not.toContain("qualities:");
  });

  it("keeps every image size below the smallest device size", () => {
    const deviceSizes = [640, 750, 828, 1080, 1200, 1920];
    const imageSizes = [16, 32, 48, 64, 96, 128, 256, 384];

    expect(Math.max(...imageSizes)).toBeLessThan(Math.min(...deviceSizes));
  });

  it("keeps remote image host scope unchanged", () => {
    expect(source).toContain("hostname: 'localhost'");
    expect(source).toContain("hostname: 'placehold.co'");
    expect(source).toContain("hostname: '*.public.blob.vercel-storage.com'");
  });
});
