import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectorSetHeroFieldSchemas,
  normalizeCollectorSetHeroData,
  validateCollectorSetHeroFields,
} from "@/lib/collectorSetHeroAdmin";

const findFirstMock = vi.hoisted(() => vi.fn());

vi.mock("@/utils/db", () => ({
  default: {
    collectorSet: {
      findFirst: findFirstMock,
    },
  },
}));

describe("collector set hero resolver", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("returns null for missing, all, disabled, and image-less heroes", async () => {
    const { getCollectorSetHero } = await import("@/lib/collectorSetHero");

    await expect(getCollectorSetHero(undefined)).resolves.toBeNull();
    await expect(getCollectorSetHero("all")).resolves.toBeNull();
    expect(findFirstMock).not.toHaveBeenCalled();

    findFirstMock.mockResolvedValueOnce({
      showHero: false,
    });
    await expect(getCollectorSetHero("ricon")).resolves.toBeNull();

    findFirstMock.mockResolvedValueOnce({
      name: "Ricon",
      image: null,
      description: null,
      heroImage: null,
      heroBadge: null,
      heroTitle: null,
      heroSubtitle: null,
      heroPrimaryCtaLabel: null,
      heroPrimaryCtaUrl: null,
      heroSecondaryCtaLabel: null,
      heroSecondaryCtaUrl: null,
      showHero: true,
      products: [],
    });
    await expect(getCollectorSetHero("ricon")).resolves.toBeNull();
  });

  it("prefers CMS hero fields and complete CTA pairs", async () => {
    const { getCollectorSetHero } = await import("@/lib/collectorSetHero");

    findFirstMock.mockResolvedValueOnce({
      name: "Ricon",
      image: "/images/set.png",
      description: "Set fallback",
      heroImage: "images/hero.png",
      heroBadge: "BST RICON",
      heroTitle: "Hero title",
      heroSubtitle: "Hero subtitle",
      heroPrimaryCtaLabel: "MUA NGAY",
      heroPrimaryCtaUrl: "/product/vanie-blind-box",
      heroSecondaryCtaLabel: "",
      heroSecondaryCtaUrl: "",
      showHero: true,
      products: [{ mainImage: "/images/product.png" }],
    });

    await expect(getCollectorSetHero("ricon")).resolves.toEqual({
      image: "/images/hero.png",
      badge: "BST RICON",
      title: "Hero title",
      subtitle: "Hero subtitle",
      primaryCta: { label: "MUA NGAY", href: "/product/vanie-blind-box" },
      secondaryCta: null,
    });
  });

  it("falls back to set copy and first slotted product image", async () => {
    const { getCollectorSetHero } = await import("@/lib/collectorSetHero");

    findFirstMock.mockResolvedValueOnce({
      name: "Vanie",
      image: null,
      description: "Vanie description",
      heroImage: null,
      heroBadge: null,
      heroTitle: null,
      heroSubtitle: null,
      heroPrimaryCtaLabel: null,
      heroPrimaryCtaUrl: null,
      heroSecondaryCtaLabel: null,
      heroSecondaryCtaUrl: null,
      showHero: true,
      products: [{ mainImage: "images/products/vanie.png" }],
    });

    await expect(getCollectorSetHero("vanie")).resolves.toMatchObject({
      image: "/images/products/vanie.png",
      badge: "Vanie",
      title: "Vanie",
      subtitle: "Vanie description",
    });
  });
});

describe("collector set hero admin validation", () => {
  const schema = z.object(collectorSetHeroFieldSchemas).superRefine(validateCollectorSetHeroFields);

  it("accepts complete internal CTA pairs", () => {
    expect(
      schema.safeParse({
        heroPrimaryCtaLabel: "MUA NGAY",
        heroPrimaryCtaUrl: "/product/vanie-blind-box",
      }).success,
    ).toBe(true);
  });

  it("rejects incomplete or external CTA pairs", () => {
    expect(schema.safeParse({ heroPrimaryCtaLabel: "MUA NGAY" }).success).toBe(false);
    expect(schema.safeParse({ heroPrimaryCtaUrl: "/product/vanie-blind-box" }).success).toBe(false);
    expect(
      schema.safeParse({
        heroPrimaryCtaLabel: "MUA NGAY",
        heroPrimaryCtaUrl: "https://example.com",
      }).success,
    ).toBe(false);
  });

  it("normalizes empty optional fields to null", () => {
    expect(
      normalizeCollectorSetHeroData({
        heroImage: "",
        heroTitle: "  Ricon  ",
        showHero: false,
      }),
    ).toEqual({
      heroImage: null,
      heroTitle: "Ricon",
      showHero: false,
    });
  });
});
