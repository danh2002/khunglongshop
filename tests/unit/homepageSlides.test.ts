import { describe, expect, it, vi } from "vitest";
import { getActiveCmsSlides, HOMEPAGE_SLIDE_LIMIT } from "@/lib/homepageSlides";

describe("getActiveCmsSlides", () => {
  it("loads active slides with deterministic ordering and public limit", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "slide-1",
        imageUrl: "/images/homepage-slider/one.webp",
        title: "Slide 1",
        subtitle: null,
        eyebrow: "CMS",
        ctaLabel: null,
        ctaUrl: null,
        altText: "Ảnh 1",
        sortOrder: 1,
        isActive: true,
      },
    ]);
    const client = {
      homepageSliderSlide: {
        findMany,
      },
    };

    const slides = await getActiveCmsSlides(client);

    expect(findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      take: HOMEPAGE_SLIDE_LIMIT,
    });
    expect(slides).toEqual([
      {
        id: "slide-1",
        imageUrl: "/images/homepage-slider/one.webp",
        title: "Slide 1",
        subtitle: null,
        eyebrow: "CMS",
        ctaLabel: null,
        ctaUrl: null,
        altText: "Ảnh 1",
        sortOrder: 1,
        isActive: true,
      },
    ]);
  });

  it("falls back to no CMS slides when the database is unavailable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const findMany = vi.fn().mockRejectedValue({ code: "P1001" });
    const client = {
      homepageSliderSlide: {
        findMany,
      },
    };

    await expect(getActiveCmsSlides(client)).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      "[homepage] CMS slider unavailable; rendering default hero. (P1001)"
    );

    warn.mockRestore();
  });
});
