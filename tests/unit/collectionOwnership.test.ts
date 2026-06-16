import { describe, expect, it } from "vitest";
import { summarizeProductOwnership } from "@/lib/collectionOwnership";

describe("collection ownership aggregation", () => {
  it("counts duplicate redemptions and keeps the first redemption timestamp", () => {
    const first = new Date("2026-01-01T00:00:00.000Z");
    const second = new Date("2026-01-02T00:00:00.000Z");
    const ownership = summarizeProductOwnership([
      {
        productId: "vanie-1",
        status: "REDEEMED",
        usedAt: second,
        createdAt: second,
        code: "SECOND",
      },
      {
        productId: "vanie-1",
        status: "REDEEMED",
        usedAt: first,
        createdAt: first,
        code: "FIRST",
      },
      {
        productId: "vanie-1",
        status: "ACTIVE",
        usedAt: null,
        createdAt: second,
        code: "UNUSED",
      },
    ]);

    expect(ownership.get("vanie-1")).toMatchObject({
      ownedCount: 2,
      firstRedeemedAt: first,
    });
  });

  it("counts ten redeemed codes for the same product", () => {
    const redeemedAt = new Date("2026-01-01T00:00:00.000Z");
    const ownership = summarizeProductOwnership(
      Array.from({ length: 10 }, (_, index) => ({
        productId: "vanie-1",
        status: "REDEEMED",
        usedAt: redeemedAt,
        createdAt: redeemedAt,
        code: `CODE-${index}`,
      }))
    );

    expect(ownership.get("vanie-1")?.ownedCount).toBe(10);
  });
});
