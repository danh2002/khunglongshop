import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mutationFiles = [
  "app/api/orders/route.ts",
  "app/api/admin/orders/[id]/status/route.ts",
  "lib/paymentConfirmation.ts",
  "lib/orderCancellation.ts",
  "lib/orderRestoration.ts",
  "lib/paymentRenewal.ts",
];

describe("order Sheet mutation wiring", () => {
  it.each(mutationFiles)("enqueues synchronized mutation in %s", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(source).toContain("enqueueOrderSheetSync");
  });

  it("keeps external delivery in post-commit best-effort paths", () => {
    for (const file of mutationFiles) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source).toContain("bestEffortFlushOrderSheetSync");
    }
  });

  it("covers expiry through the shared cancellation service", () => {
    const expiry = readFileSync(resolve(process.cwd(), "lib/paymentExpiry.ts"), "utf8");
    expect(expiry).toContain("cancelOrder({");
  });
});
