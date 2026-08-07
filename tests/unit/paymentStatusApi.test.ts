import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "app/api/account/orders/[id]/payment/route.ts"),
  "utf8"
);

describe("payment status API", () => {
  it("requires authentication and uses an ownership-safe query", () => {
    expect(source).toContain('error: "UNAUTHORIZED"');
    expect(source).toContain("getAccountOrderOwnershipWhere(user)");
    expect(source).toContain('error: "ORDER_NOT_FOUND"');
  });

  it("returns a narrow no-store payment DTO and lazily expires due orders", () => {
    expect(source).toContain('"Cache-Control": "no-store"');
    expect(source).toContain("expirePaymentOrder(order.id, now)");
    expect(source).toContain("toPaymentDto(order, now)");
    expect(source).not.toContain("include:");
  });
});
