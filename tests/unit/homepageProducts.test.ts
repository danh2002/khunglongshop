import { describe, expect, it } from "vitest";
import { chooseHomepageProducts } from "@/lib/homepage-products";

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
