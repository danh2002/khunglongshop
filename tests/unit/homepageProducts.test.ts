import { describe, expect, it } from "vitest";
import {
  chooseHomepageProducts,
  getHomepageVariantImages,
} from "@/lib/homepage-products";

const databaseProduct: Product = {
  id: "db-product",
  slug: "db-product",
  title: "Database Product",
  price: 125,
  rating: 5,
  description: "Loaded from MySQL",
  mainImage: "images/mk1.png",
  manufacturer: "Khung Long Shop",
  categoryId: "category-id",
  category: { name: "Vanie" },
  inStock: 10,
  isCollector: true,
  isBlindBox: false,
  isVisible: false,
};

describe("homepage product selection", () => {
  it("keeps products returned by MySQL", () => {
    expect(chooseHomepageProducts([databaseProduct])).toEqual([databaseProduct]);
  });

  it("does not inject legacy fallback products when the public SKU is missing", () => {
    expect(chooseHomepageProducts([])).toEqual([]);
  });
});

describe("homepage variant images", () => {
  it("uses blind-box pool images before gallery images", () => {
    const product = {
      ...databaseProduct,
      images: JSON.stringify(["/images/gallery-1.png", "/images/gallery-2.png"]),
      blindBoxSet: {
        poolVersions: [
          {
            entries: [
              { product: { mainImage: "/images/pool-1.png" } },
              { product: { mainImage: "/images/pool-2.png" } },
            ],
          },
        ],
      },
    };

    expect(getHomepageVariantImages(product)).toEqual([
      "/images/pool-1.png",
      "/images/pool-2.png",
      "/images/gallery-1.png",
      "/images/gallery-2.png",
    ]);
  });

  it("falls back to gallery images when no active pool entries are available", () => {
    const product = {
      ...databaseProduct,
      images: JSON.stringify(["/images/gallery-1.png", "/images/gallery-2.png"]),
      blindBoxSet: {
        poolVersions: [{ entries: [] }],
      },
    };

    expect(getHomepageVariantImages(product)).toEqual([
      "/images/gallery-1.png",
      "/images/gallery-2.png",
    ]);
  });

  it("removes duplicate and invalid variant images", () => {
    const product = {
      ...databaseProduct,
      images: JSON.stringify(["/images/duplicate.png", "/images/gallery.png"]),
      blindBoxSet: {
        poolVersions: [
          {
            entries: [
              { product: { mainImage: "/images/duplicate.png" } },
              { product: { mainImage: null } },
            ],
          },
        ],
      },
    };

    expect(getHomepageVariantImages(product)).toEqual([
      "/images/duplicate.png",
      "/images/gallery.png",
    ]);
  });
});
