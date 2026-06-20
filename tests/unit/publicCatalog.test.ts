import { describe, expect, it } from "vitest";
import {
  buildCollectorGalleryWhere,
  buildPublicProductDetailWhere,
  buildPublicProductListResponse,
  buildPublicStorefrontWhere,
  isPubliclySellableProduct,
  normalizeCatalogImage,
  toPublicCatalogProduct,
} from "@/lib/publicCatalog";

const blindBox = {
  id: "vanie-blind-box",
  slug: "vanie-blind-box",
  title: "Túi mù Vanie",
  price: 150000,
  mainImage: "images/blind-box/vanie-blind-box-cover.png",
  inStock: 5,
  categoryId: "vanie",
  setId: null,
  isVisible: true,
  isBlindBox: true,
  isCollector: false,
};

describe("public catalog policy", () => {
  it("accepts any visible blind-box SKU but rejects collector variants", () => {
    expect(isPubliclySellableProduct(blindBox)).toBe(true);
    expect(
      isPubliclySellableProduct({
        ...blindBox,
        slug: "tuimuricon",
      })
    ).toBe(true);
    expect(
      isPubliclySellableProduct({
        ...blindBox,
        slug: "vanie-1",
        isBlindBox: false,
        isCollector: true,
      })
    ).toBe(false);
    expect(
      isPubliclySellableProduct({
        ...blindBox,
        slug: "legacy-product",
        isBlindBox: false,
      })
    ).toBe(false);
  });

  it("keeps character links on the collector gallery instead of the sellable storefront", () => {
    expect(buildPublicStorefrontWhere({ characterSlug: "ricon" })).toMatchObject({
      isVisible: true,
      isBlindBox: true,
      isCollector: false,
    });
    expect(buildCollectorGalleryWhere({ characterSlug: "ricon" })).toMatchObject({
      isCollector: true,
      setId: { not: null },
      setSlotNumber: { not: null },
      set: {
        is: {
          OR: [{ slug: "ricon" }, { name: "ricon" }],
        },
      },
    });
    expect(buildCollectorGalleryWhere({ characterSlug: "all" })).toMatchObject({
      isCollector: true,
      setId: { not: null },
      setSlotNumber: { not: null },
    });
  });

  it("includes collector gallery products only when they belong to an active pool version", () => {
    expect(buildCollectorGalleryWhere({ characterSlug: "ricon" })).toMatchObject({
      isCollector: true,
      setId: { not: null },
      setSlotNumber: { not: null },
      poolEntries: {
        some: {
          poolVersion: {
            status: "ACTIVE",
          },
        },
      },
    });
  });

  it("excludes collector products that only have draft or no pool versions from the gallery", () => {
    const where = buildCollectorGalleryWhere();

    expect(where).toMatchObject({
      poolEntries: {
        some: {
          poolVersion: {
            status: "ACTIVE",
          },
        },
      },
    });
    expect(where).not.toMatchObject({
      poolEntries: {
        some: {
          poolVersion: {
            status: "DRAFT",
          },
        },
      },
    });
  });

  it("builds product detail queries so draft collector direct URLs return 404", () => {
    expect(buildPublicProductDetailWhere("draft-collector")).toEqual({
      slug: "draft-collector",
      OR: [
        {
          isVisible: true,
          isBlindBox: true,
          isCollector: false,
        },
        {
          isCollector: true,
          setId: { not: null },
          setSlotNumber: { not: null },
          poolEntries: {
            some: {
              poolVersion: {
                status: "ACTIVE",
              },
            },
          },
        },
      ],
    });
  });

  it("maps authoritative database fields without merchandise templates", () => {
    expect(toPublicCatalogProduct(blindBox)).toEqual({
      id: blindBox.id,
      slug: blindBox.slug,
      title: blindBox.title,
      price: 150000,
      mainImage: "/images/blind-box/vanie-blind-box-cover.png",
      inStock: true,
      categoryId: "vanie",
      setId: null,
      rarityTier: null,
    });
  });

  it("normalizes local image paths without producing protocol-relative URLs", () => {
    expect(normalizeCatalogImage("images/products/vanie.jpg")).toBe("/images/products/vanie.jpg");
    expect(normalizeCatalogImage("/images/products/vanie.jpg")).toBe("/images/products/vanie.jpg");
    expect(normalizeCatalogImage("//images/products/vanie.jpg")).toBe("/images/products/vanie.jpg");
  });

  it("returns the locked pagination contract", () => {
    expect(buildPublicProductListResponse([blindBox], 1, 1)).toMatchObject({
      page: 1,
      total: 1,
      totalPages: 1,
      pageSize: 12,
    });
  });
});
