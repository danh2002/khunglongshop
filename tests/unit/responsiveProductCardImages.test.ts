import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("responsive product-card images", () => {
  it("keeps ProductItem server-rendered while delegating image errors to ProductCardImage", () => {
    const productItem = source("components/ProductItem.tsx");

    expect(productItem).not.toContain('"use client"');
    expect(productItem).toContain('import ProductCardImage from "./ProductCardImage"');
    expect(productItem).toContain("<ProductCardImage");
    expect(productItem).toContain('imageSizes?: string');
  });

  it("uses the responsive mobile slot width for FeaturedSeries product images", () => {
    const featuredSeries = source("components/FeaturedSeries.tsx");

    expect(featuredSeries).toContain('import ProductCardImage from "./ProductCardImage"');
    expect(featuredSeries).toContain("<ProductCardImage");
    expect(featuredSeries).toContain(
      'sizes="(max-width: 520px) calc((100vw - 124px) / 2), 120px"'
    );
  });

  it("keeps the shop grid at two columns on mobile with matching image sizes", () => {
    const products = source("components/Products.tsx");

    expect(products).toContain("max-lg:grid-cols-2");
    expect(products).not.toContain("max-[500px]:grid-cols-1");
    expect(products).toContain(
      'imageSizes="(max-width: 1024px) calc((100vw - 52px) / 2), 33vw"'
    );
  });

  it("guards the local fallback against a repeated failed assignment", () => {
    const productCardImage = source("components/ProductCardImage.tsx");

    expect(productCardImage).toContain('const PRODUCT_IMAGE_FALLBACK = "/images/logo.png"');
    expect(productCardImage).toContain("onError={() => {");
    expect(productCardImage).toContain("if (displaySrc !== PRODUCT_IMAGE_FALLBACK)");
  });
});
