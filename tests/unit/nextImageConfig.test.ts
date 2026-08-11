import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Next image optimizer configuration", () => {
  const source = readFileSync(resolve(process.cwd(), "next.config.mjs"), "utf8");

  it("uses bounded width sets instead of broad defaults", () => {
    expect(source).toContain("deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920]");
    expect(source).toContain(
      "imageSizes: [24, 38, 48, 52, 56, 60, 72, 80, 88, 120, 180, 200, 220, 260, 340, 360, 420]"
    );
    expect(source).not.toContain("deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840]");
    expect(source).not.toContain("imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]");
  });

  it("keeps every image size below the smallest device size", () => {
    const deviceSizes = [640, 750, 828, 1080, 1200, 1440, 1920];
    const imageSizes = [24, 38, 48, 52, 56, 60, 72, 80, 88, 120, 180, 200, 220, 260, 340, 360, 420];

    expect(Math.max(...imageSizes)).toBeLessThan(Math.min(...deviceSizes));
  });

  it("keeps remote image host scope unchanged", () => {
    expect(source).toContain("hostname: 'localhost'");
    expect(source).toContain("hostname: 'placehold.co'");
    expect(source).toContain("hostname: '*.public.blob.vercel-storage.com'");
  });
});
