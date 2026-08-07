import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  resolve(process.cwd(), "app/api/cron/order-sheet-sync/route.ts"),
  "utf8"
);
const vercel = readFileSync(resolve(process.cwd(), "vercel.json"), "utf8");

describe("order Sheet synchronization cron", () => {
  it("requires CRON_SECRET and uses bounded outbound/inbound batches", () => {
    expect(route).toContain("Bearer ${secret}");
    expect(route).toContain("flushOrderSheetSync({ limit: 50, config })");
    expect(route).toContain("fetchChangedOrderSheetStatuses({ limit: 100, config })");
    expect(route).toContain('error: "UNAUTHORIZED"');
  });

  it("returns count-only results and provides confirmed bounded backfill", () => {
    expect(route).toContain("scanned: 0");
    expect(route).toContain("remaining: 0");
    expect(route).toContain('confirm: z.literal("ENQUEUE").optional()');
    expect(route).toContain(".max(100)");
    expect(route).not.toContain("customerName");
    expect(vercel).toContain('"path": "/api/cron/order-sheet-sync"');
  });
});
