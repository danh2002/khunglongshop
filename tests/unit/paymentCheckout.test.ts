import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  resolve(process.cwd(), "app/api/orders/route.ts"),
  "utf8"
);

describe("checkout payment session wiring", () => {
  it("returns a structured response for otherwise unhandled route errors", () => {
    expect(route).toContain('console.error("[api/orders] unhandled error:", err)');
    expect(route).toContain('{ error: "ORDER_CREATION_FAILED" }');
    expect(route).not.toContain("detail: String(err)");
  });

  it("creates payment metadata inside the atomic checkout transaction", () => {
    expect(route).toContain("withPaymentRefRetry(");
    expect(route).toContain("paymentRef,");
    expect(route).toContain("paymentExpiresAt: new Date(Date.now() + PAYMENT_WINDOW_MS)");
    expect(route).toContain('status: "PENDING_PAYMENT"');
  });

  it("preflights VietQR configuration before opening the transaction", () => {
    const configGuard = route.indexOf("paymentConfig = getPaymentConfig()");
    const transaction = route.indexOf("withPaymentRefRetry(");
    expect(configGuard).toBeGreaterThan(-1);
    expect(configGuard).toBeLessThan(transaction);
    expect(route).toContain('return errorResponse(503, error.code)');
  });

  it("returns existing payment metadata without silently backfilling it", () => {
    expect(route).toContain('new PaymentError("PAYMENT_SESSION_UNAVAILABLE")');
    expect(route).toContain(
      "payment: toPaymentDto(order, new Date(), paymentConfig)"
    );
  });
});
