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
});
