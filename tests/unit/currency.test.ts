import { describe, expect, it } from "vitest";
import { formatVnd, formatVndTotal } from "@/lib/currency";

describe("Vietnamese currency formatting", () => {
  it("formats integer prices as VND", () => {
    expect(formatVnd(150000)).toBe("150.000đ");
  });

  it("shows contact text for missing or zero prices", () => {
    expect(formatVnd(0)).toBe("Liên hệ");
    expect(formatVnd(null)).toBe("Liên hệ");
  });

  it("formats cart totals as VND including zero", () => {
    expect(formatVndTotal(540000)).toBe("540.000đ");
    expect(formatVndTotal(0)).toBe("0đ");
  });
});
