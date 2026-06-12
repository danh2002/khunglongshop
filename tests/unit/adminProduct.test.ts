import { describe, expect, it } from "vitest";
import {
  adminProductSchema,
  parseProductImages,
  serializeProductImages,
} from "@/lib/adminProduct";

const validProduct = {
  title: "Khủng long mẫu",
  slug: "khung-long-mau",
  mainImage: "/images/products/main.webp",
  images: ["/images/products/gallery-1.webp"],
  price: 100000,
  rating: 5,
  description: "Sản phẩm kiểm thử",
  manufacturer: "Khủng Long Shop",
  inStock: 3,
  categoryId: "category-id",
  merchantId: "merchant-id",
  isCollector: false,
  setId: null,
  setSlotNumber: null,
  isBlindBox: false,
  blindBoxSetId: null,
};

describe("adminProductSchema image fields", () => {
  it("accepts a main image and up to eight gallery image paths", () => {
    const result = adminProductSchema.safeParse({
      ...validProduct,
      images: Array.from({ length: 8 }, (_, index) => `/images/products/gallery-${index}.webp`),
    });

    expect(result.success).toBe(true);
  });

  it("rejects more than eight gallery images", () => {
    const result = adminProductSchema.safeParse({
      ...validProduct,
      images: Array.from({ length: 9 }, (_, index) => `/images/products/gallery-${index}.webp`),
    });

    expect(result.success).toBe(false);
  });

  it("rejects gallery URLs outside the local images directory", () => {
    const result = adminProductSchema.safeParse({
      ...validProduct,
      images: ["https://example.com/product.webp"],
    });

    expect(result.success).toBe(false);
  });

  it("accepts and normalizes legacy product image paths", () => {
    const result = adminProductSchema.safeParse({
      ...validProduct,
      mainImage: "images/mk1.png",
      images: ["images/products/gallery-1.webp"],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mainImage).toBe("/images/mk1.png");
      expect(result.data.images).toEqual(["/images/products/gallery-1.webp"]);
    }
  });

  it("accepts a serialized gallery from legacy clients", () => {
    const result = adminProductSchema.safeParse({
      ...validProduct,
      images: JSON.stringify(["/images/products/gallery-1.webp"]),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.images).toEqual(["/images/products/gallery-1.webp"]);
    }
  });

  it("keeps the selected blind-box collection id", () => {
    const result = adminProductSchema.safeParse({
      ...validProduct,
      isBlindBox: true,
      blindBoxSetId: "vanie-collection",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blindBoxSetId).toBe("vanie-collection");
    }
  });

  it("normalizes legacy null slot strings", () => {
    const result = adminProductSchema.safeParse({
      ...validProduct,
      setSlotNumber: "null",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.setSlotNumber).toBeNull();
    }
  });

  it("accepts the full product-detail form payload", () => {
    const result = adminProductSchema.safeParse({
      ...validProduct,
      id: "vanie-blind-box",
      mainImage: "images/blind-box/vanie-blind-box-cover.png",
      images: "[]",
      price: "150000",
      inStock: "100",
      isBlindBox: true,
      blindBoxSetId: "vanie-collection",
      dependencyCounts: { orderItemCount: 0 },
      category: { id: "category-id", name: "Blind Box" },
      merchant: { id: "merchant-id", name: "Khủng Long Shop" },
      set: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        mainImage: "/images/blind-box/vanie-blind-box-cover.png",
        images: [],
        price: 150000,
        inStock: 100,
        isBlindBox: true,
        blindBoxSetId: "vanie-collection",
      });
    }
  });
});

describe("product gallery persistence", () => {
  it("serializes and parses gallery images", () => {
    const images = ["/images/products/one.webp", "/images/products/two.webp"];

    expect(parseProductImages(serializeProductImages(images))).toEqual(images);
  });

  it("returns an empty gallery for malformed stored data", () => {
    expect(parseProductImages("not-json")).toEqual([]);
    expect(parseProductImages('{"image":"wrong-shape"}')).toEqual([]);
  });
});
