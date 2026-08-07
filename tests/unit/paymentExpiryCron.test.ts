import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "app/api/cron/payment-expiry/route.ts"),
  "utf8"
);

describe("payment expiry cron", () => {
  it("requires the cron bearer secret and uses a bounded batch", () => {
    expect(source).toContain("Bearer ${process.env.CRON_SECRET}");
    expect(source).toContain("expireDuePaymentOrders(new Date(), 50)");
    expect(source).toContain('error: "UNAUTHORIZED"');
  });
});
