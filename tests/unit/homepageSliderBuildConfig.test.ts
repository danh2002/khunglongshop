import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin build configuration", () => {
  it("keeps authenticated dashboard routes out of static prerendering", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/layout.tsx"),
      "utf8"
    );

    expect(layout).toContain('export const dynamic = "force-dynamic"');
  });

  it("normalizes empty NextAuth URLs before the client bundle is evaluated", () => {
    const config = readFileSync(resolve(process.cwd(), "next.config.mjs"), "utf8");

    expect(config).toContain('["NEXTAUTH_URL", "NEXTAUTH_URL_INTERNAL"]');
    expect(config).toContain('process.env[key]?.trim() === ""');
    expect(config).toContain("delete process.env[key]");
  });
});
