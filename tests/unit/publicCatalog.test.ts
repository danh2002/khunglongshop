import { describe, expect, it } from "vitest";
import {
  buildPublicProductListResponse,
  isPubliclySellableProduct,
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
  it("accepts only the visible Vanie blind-box SKU", () => {
    expect(isPubliclySellableProduct(blindBox)).toBe(true);
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
      })
    ).toBe(false);
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

  it("returns the locked pagination contract", () => {
    expect(buildPublicProductListResponse([blindBox], 1, 1)).toMatchObject({
      page: 1,
      total: 1,
      totalPages: 1,
      pageSize: 12,
    });
  });
});
