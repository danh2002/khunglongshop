import { describe, expect, it } from "vitest";
import { calculateCartSummary } from "@/lib/cart";

describe("cart summary", () => {
  it("calculates total quantity and merchandise value", () => {
    expect(
      calculateCartSummary([
        { price: 150000, amount: 2 },
        { price: 80000, amount: 3 },
      ])
    ).toEqual({ allQuantity: 5, total: 540000 });
  });

  it("normalizes invalid quantities and prices", () => {
    expect(
      calculateCartSummary([
        { price: -10, amount: 0 },
        { price: 50000, amount: 1.8 },
      ])
    ).toEqual({ allQuantity: 2, total: 50000 });
  });
});
