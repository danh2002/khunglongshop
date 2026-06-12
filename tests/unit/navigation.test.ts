import { describe, expect, it } from "vitest";
import {
  getCategoryNavigationSlug,
  getCollectorNavigationSlug,
} from "@/lib/navigation";
import { toSlug } from "@/lib/slug";

describe("navbar navigation slugs", () => {
  it("normalizes Vietnamese labels into stable URL slugs", () => {
    expect(toSlug("Đồ Sưu Tập")).toBe("do-suu-tap");
  });

  it("deduplicates the static Hộp mù and Vanie entries for legacy rows", () => {
    expect(getCategoryNavigationSlug("Hộp mù", null)).toBe("hop-mu");
    expect(getCollectorNavigationSlug("Bộ sưu tập Vanie", null)).toBe("vanie");
  });

  it("preserves explicit custom slugs", () => {
    expect(getCategoryNavigationSlug("Figure", "figure-cao-cap")).toBe("figure-cao-cap");
    expect(getCollectorNavigationSlug("Rex", "rex-series")).toBe("rex-series");
  });
});
