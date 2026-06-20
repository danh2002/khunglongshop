import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Search page wiring", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "app", "search", "page.tsx"),
    "utf8",
  );

  it("reads q with legacy search fallback", () => {
    expect(source).toContain("q?: string; search?: string");
    expect(source).toContain("normalizeSearchQuery(sp ?? {})");
  });

  it("filters public products by title when a query is present", () => {
    expect(source).toContain("PUBLIC_STOREFRONT_PRODUCT_WHERE");
    expect(source).toContain("...(query");
    expect(source).toContain("{ title: { contains: query } }");
  });
});
