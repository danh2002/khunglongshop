import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin dashboard order metrics", () => {
  it("excludes cancelled orders from monthly count and revenue", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/admin/page.tsx"),
      "utf8"
    );
    const cancelledFilter = 'status: { notIn: ["CANCELLED"] }';

    expect(source.split(cancelledFilter)).toHaveLength(3);
  });
});
