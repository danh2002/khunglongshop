import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAdminOrderSearchWhere } from "@/lib/adminOrderSearch";

describe("admin order search", () => {
  it("matches every word across separate customer fields", () => {
    expect(buildAdminOrderSearchWhere("Minh Ngọc")).toEqual({
      AND: [
        {
          OR: [
            { id: { contains: "Minh" } },
            { email: { contains: "Minh" } },
            { name: { contains: "Minh" } },
            { lastname: { contains: "Minh" } },
            { phone: { contains: "Minh" } },
          ],
        },
        {
          OR: [
            { id: { contains: "Ngọc" } },
            { email: { contains: "Ngọc" } },
            { name: { contains: "Ngọc" } },
            { lastname: { contains: "Ngọc" } },
            { phone: { contains: "Ngọc" } },
          ],
        },
      ],
    });
  });

  it("keeps numeric order-number searches and normalizes whitespace", () => {
    expect(buildAdminOrderSearchWhere("  550003  ")).toEqual({
      AND: [
        {
          OR: [
            { id: { contains: "550003" } },
            { email: { contains: "550003" } },
            { name: { contains: "550003" } },
            { lastname: { contains: "550003" } },
            { phone: { contains: "550003" } },
            { orderNumber: 550003 },
          ],
        },
      ],
    });
  });

  it("does not add a search condition for blank input", () => {
    expect(buildAdminOrderSearchWhere("   ")).toEqual({});
  });

  it("uses the shared multi-word search in the admin page and API", () => {
    const page = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/admin/orders/page.tsx"),
      "utf8"
    );
    const route = readFileSync(
      resolve(process.cwd(), "app/api/admin/orders/route.ts"),
      "utf8"
    );

    for (const source of [page, route]) {
      expect(source).toContain(
        'import { buildAdminOrderSearchWhere } from "@/lib/adminOrderSearch"'
      );
      expect(source).toContain("...buildAdminOrderSearchWhere(search)");
    }
  });
});
