import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { VIETNAM_PROVINCES } from "@/lib/vietnam-provinces";

const checkoutPage = readFileSync(
  resolve(process.cwd(), "app/(public)/checkout/page.tsx"),
  "utf8"
);

describe("Vietnam province checkout options", () => {
  it("contains all 63 entries with the municipalities first", () => {
    expect(VIETNAM_PROVINCES).toHaveLength(63);
    expect(VIETNAM_PROVINCES.slice(0, 5)).toEqual([
      "TP. Hồ Chí Minh",
      "Hà Nội",
      "Đà Nẵng",
      "Hải Phòng",
      "Cần Thơ",
    ]);
    expect(new Set(VIETNAM_PROVINCES).size).toBe(63);
    expect(VIETNAM_PROVINCES).not.toContain("Khác");
  });

  it("renders the shared list after the empty placeholder", () => {
    const placeholderIndex = checkoutPage.indexOf(
      '<option value="">Chọn Tỉnh, Thành phố</option>'
    );
    const listIndex = checkoutPage.indexOf("VIETNAM_PROVINCES.map");

    expect(placeholderIndex).toBeGreaterThan(-1);
    expect(listIndex).toBeGreaterThan(placeholderIndex);
    expect(checkoutPage).not.toContain('<option value="Khác">');
  });
});
