import { describe, expect, it } from "vitest";
import { buildShopProductsPath } from "@/lib/shop-products";

describe("shop product query", () => {
  it("does not add a stock filter when both availability options are false", () => {
    const path = buildShopProductsPath(undefined, {
      inStock: "false",
      outOfStock: "false",
      rating: "0",
      price: "3000",
      sort: "defaultSort",
      page: "1",
    });

    expect(path).not.toContain("filters[inStock]");
    expect(path).toContain("filters[price][$lte]=3000");
    expect(path).toContain("page=1");
  });

  it("treats positive inventory as in stock", () => {
    const path = buildShopProductsPath(undefined, {
      inStock: "true",
      outOfStock: "false",
    });

    expect(path).toContain("filters[inStock][$gt]=0");
  });

  it("filters out-of-stock products by zero inventory", () => {
    const path = buildShopProductsPath(undefined, {
      inStock: "false",
      outOfStock: "true",
    });

    expect(path).toContain("filters[inStock][$equals]=0");
  });

  it("passes the newest sort option to the products API", () => {
    const path = buildShopProductsPath(undefined, {
      sort: "newestSort",
    });

    expect(path).toContain("sort=newestSort");
  });
});
