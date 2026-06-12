import type { Prisma } from "@prisma/client";

export const PUBLIC_BLIND_BOX_SLUG = "vanie-blind-box";
export const PUBLIC_CATALOG_PAGE_SIZE = 12;

export const PUBLIC_STOREFRONT_PRODUCT_WHERE = {
  isVisible: true,
  isBlindBox: true,
  isCollector: false,
  slug: PUBLIC_BLIND_BOX_SLUG,
} satisfies Prisma.ProductWhereInput;

export type PublicCatalogProduct = {
  id: string;
  slug: string;
  title: string;
  price: number;
  mainImage: string;
  inStock: boolean;
  categoryId: string;
  setId: string | null;
  rarityTier: string | null;
};

export type PublicProductListResponse = {
  products: PublicCatalogProduct[];
  page: number;
  total: number;
  totalPages: number;
  pageSize: number;
};

type PublicProductSource = {
  id: string;
  slug: string;
  title: string;
  price: number;
  mainImage: string;
  inStock: number;
  categoryId: string;
  setId: string | null;
  isVisible: boolean;
  isBlindBox: boolean;
  isCollector: boolean;
};

export function isPubliclySellableProduct(product: {
  slug: string;
  isVisible: boolean;
  isBlindBox: boolean;
  isCollector: boolean;
}) {
  return (
    product.slug === PUBLIC_BLIND_BOX_SLUG &&
    product.isVisible &&
    product.isBlindBox &&
    !product.isCollector
  );
}

export function normalizeCatalogImage(path: string) {
  if (!path) return "/product_placeholder.jpg";
  return path.startsWith("/") ? path : `/${path}`;
}

export function toPublicCatalogProduct(
  product: PublicProductSource
): PublicCatalogProduct {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    price: product.price,
    mainImage: normalizeCatalogImage(product.mainImage),
    inStock: product.inStock > 0,
    categoryId: product.categoryId,
    setId: product.setId,
    rarityTier: null,
  };
}

export function buildPublicProductListResponse(
  products: PublicProductSource[],
  page: number,
  total: number,
  pageSize = PUBLIC_CATALOG_PAGE_SIZE
): PublicProductListResponse {
  return {
    products: products.map(toPublicCatalogProduct),
    page,
    total,
    totalPages: Math.ceil(total / pageSize),
    pageSize,
  };
}
