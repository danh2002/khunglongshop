import { describe, expect, it } from "vitest";
import {
  selectWeightedEntry,
  validateBlindBoxPool,
} from "@/lib/blindBox";

const entries = Array.from({ length: 10 }, (_, index) => ({
  productId: `vanie-${index + 1}`,
  slotNumber: index + 1,
  drawWeight: index === 9 ? 10 : 100,
  rarityTier: index === 9 ? ("LEGENDARY" as const) : ("COMMON" as const),
}));

describe("blind-box pool", () => {
  it("accepts the default Vanie weights", () => {
    expect(validateBlindBoxPool(entries)).toEqual({
      valid: true,
      totalWeight: 910,
      errors: [],
    });
  });

  it("rejects a pool where Vanie 10 is not rarer than Vanie 1", () => {
    const invalid = entries.map((entry) => ({ ...entry, drawWeight: 100 }));
    expect(validateBlindBoxPool(invalid).valid).toBe(false);
  });

  it("rejects a pool whose total weight exceeds 10,000,000", () => {
    const invalid = entries.map((entry) => ({
      ...entry,
      drawWeight: entry.slotNumber === 10 ? 999_999 : 1_000_000,
    })).concat({
      productId: "unexpected-variant",
      slotNumber: 11,
      drawWeight: 1_000_000,
      rarityTier: "COMMON" as const,
    });
    expect(validateBlindBoxPool(invalid).errors).toContain(
      "Tổng trọng số không được vượt quá 10000000."
    );
  });

  it("selects deterministic cumulative boundaries", () => {
    expect(selectWeightedEntry(entries, 0).slotNumber).toBe(1);
    expect(selectWeightedEntry(entries, 99).slotNumber).toBe(1);
    expect(selectWeightedEntry(entries, 100).slotNumber).toBe(2);
    expect(selectWeightedEntry(entries, 909).slotNumber).toBe(10);
  });
});
