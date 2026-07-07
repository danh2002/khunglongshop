import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("shop startup payload boundaries", () => {
  it("imports shop and collection route components directly instead of through the components barrel", () => {
    const shopPage = source("app/(public)/shop/[[...slug]]/page.tsx");
    const collectionPage = source("app/(public)/bo-suu-tap/page.tsx");

    expect(shopPage).toContain('import Breadcrumb from "@/components/Breadcrumb"');
    expect(shopPage).toContain('import Products from "@/components/Products"');
    expect(shopPage).not.toContain('from "@/components"');

    expect(collectionPage).toContain('import Breadcrumb from "@/components/Breadcrumb"');
    expect(collectionPage).toContain('import Products from "@/components/Products"');
    expect(collectionPage).not.toContain('from "@/components"');
  });

  it("keeps ProductItem server-rendered without cart store or toast imports", () => {
    const productItem = source("components/ProductItem.tsx");

    expect(productItem).not.toContain('"use client"');
    expect(productItem).not.toContain("react-hot-toast");
    expect(productItem).not.toContain("useProductStore");
  });

  it("keeps cart and toast imports in the small product quick-add client component", () => {
    const productItem = source("components/ProductItem.tsx");
    const quickAdd = source("components/ProductQuickAdd.tsx");

    expect(quickAdd).toContain('"use client"');
    expect(quickAdd).toContain('import toast from "react-hot-toast"');
    expect(quickAdd).toContain('useProductStore');
    expect(productItem).toContain("ProductQuickAdd");
    expect(productItem).not.toContain('import toast from "react-hot-toast"');
  });

  it("prioritizes only the first desktop row of product images", () => {
    const products = source("components/Products.tsx");
    const productItem = source("components/ProductItem.tsx");

    expect(products).toContain("products.map((product, index)");
    expect(products).toContain("imagePriority={index < 3}");
    expect(productItem).toContain("imagePriority = false");
    expect(productItem).toContain('loading={imagePriority ? "eager" : "lazy"}');
    expect(productItem).toContain('fetchPriority={imagePriority ? "high" : "auto"}');
  });

  it("uses a static public shell for shop routes without importing framer-motion", () => {
    const shopPage = source("app/(public)/shop/[[...slug]]/page.tsx");
    const collectionPage = source("app/(public)/bo-suu-tap/page.tsx");
    const publicShell = source("components/public-shell.tsx");

    expect(shopPage).toContain('from "@/components/public-shell"');
    expect(collectionPage).toContain('from "@/components/public-shell"');
    expect(publicShell).not.toContain("framer-motion");
    expect(publicShell).not.toContain("LazyMotion");
    expect(publicShell).not.toContain("domAnimation");
    expect(publicShell).not.toContain("MDiv");
  });
});
