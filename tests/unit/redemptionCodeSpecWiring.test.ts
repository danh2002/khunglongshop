import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("issue 5 redemption-code spec wiring", () => {
  it("creates admin redemption codes as single-product unowned atomic requests with audit logging", () => {
    const route = source("app/api/admin/redemption-codes/route.ts");

    expect(route).toContain(".strict()");
    expect(route).toContain("quantity: z.number().int().min(1).max(500)");
    expect(route).not.toContain("orderId: z.string()");
    expect(route).not.toContain("userId: z.string()");
    expect(route).toContain("prisma.$transaction");
    expect(route).toContain("REDEMPTION_CODES_CREATED");
    expect(route).toContain("userId: null");
    expect(route).toContain("orderId: null");
    expect(route).toContain("product: {");
  });

  it("filters admin products to fully valid collector products with collectorOnly=true", () => {
    const route = source("app/api/admin/products/route.ts");

    expect(route).toContain('searchParams.get("collectorOnly") === "true"');
    expect(route).toContain("isCollector: true");
    expect(route).toContain("setId: { not: null }");
    expect(route).toContain("setSlotNumber: { not: null }");
  });

  it("checks redeem role eligibility before rate limiting", () => {
    const route = source("app/api/merch/redeem-code/route.ts");
    const roleCheckIndex = route.indexOf("REDEEM_ROLE_NOT_ALLOWED");
    const rateLimitIndex = route.indexOf("isRateLimited(`redeem-code");

    expect(roleCheckIndex).toBeGreaterThan(-1);
    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(roleCheckIndex).toBeLessThan(rateLimitIndex);
  });

  it("types and displays duplicate ownership counts in the collection UI", () => {
    const page = source("app/account/collection/page.tsx");

    expect(page).toContain("ownedCount: number");
    expect(page).toContain("OwnedCountBadge");
    expect(page).toContain("x{slot.ownedCount}");
  });

  it("exposes a manual-copy fallback for generated codes", () => {
    const form = source("components/admin/RedemptionCodeCreateForm.tsx");

    expect(form).toContain("navigator.clipboard?.writeText");
    expect(form).toContain("readOnly");
    expect(form).toContain('aria-label="Code vừa tạo"');
    expect(form).toContain("collectorOnly");
  });
});
