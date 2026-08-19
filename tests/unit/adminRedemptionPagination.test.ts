import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin redemption code pagination", () => {
  const source = readFileSync(
    resolve(process.cwd(), "app/(dashboard)/admin/redemption-codes/page.tsx"),
    "utf8"
  );

  it("preserves active filters when building pagination links", () => {
    expect(source).toContain("const pageHref = (nextPage: number)");
    expect(source).toContain('if (search) hrefParams.set("search", search)');
    expect(source).toContain('if (setId) hrefParams.set("set", setId)');
    expect(source).toContain('if (status) hrefParams.set("status", status)');
    expect(source).toContain('hrefParams.set("page", String(nextPage))');
    expect(source).toContain("href={pageHref(page - 1)}");
    expect(source).toContain("href={pageHref(page + 1)}");
    expect(source).not.toContain('href={`?page=${page - 1}`}');
    expect(source).not.toContain('href={`?page=${page + 1}`}');
  });
});
