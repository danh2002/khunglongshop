import type { Prisma } from "@prisma/client";

export const PUBLIC_BLIND_BOX_SLUG = "vanie-blind-box";
export const PUBLIC_CATALOG_PAGE_SIZE = 12;

export const PUBLIC_STOREFRONT_PRODUCT_WHERE = {
  isVisible: true,
  isBlindBox: true,
  isCollector: false,
} satisfies Prisma.ProductWhereInput;

export const PUBLIC_COLLECTOR_PRODUCT_WHERE = {
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
} satisfies Prisma.ProductWhereInput;

export type PublicStorefrontFilters = {
  categorySlug?: string | null;
  characterSlug?: string | null;
};

export type CollectorGalleryFilters = {
  characterSlug?: string | null;
};

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
  return product.isVisible && product.isBlindBox && !product.isCollector;
}

export function buildPublicStorefrontWhere(
  filters: PublicStorefrontFilters = {}
) {
  const categorySlug = filters.categorySlug?.trim();

  return {
    ...PUBLIC_STOREFRONT_PRODUCT_WHERE,
    ...(categorySlug && categorySlug !== "hop-mu"
      ? {
          category: {
            is: {
              OR: [{ slug: categorySlug }, { name: categorySlug }],
            },
          },
        }
      : {}),
  } satisfies Prisma.ProductWhereInput;
}

export function buildCollectorGalleryWhere(
  filters: CollectorGalleryFilters = {}
) {
  const characterSlug = filters.characterSlug?.trim();

  return {
    ...PUBLIC_COLLECTOR_PRODUCT_WHERE,
    ...(characterSlug && characterSlug !== "all"
      ? {
          set: {
            is: {
              OR: [{ slug: characterSlug }, { name: characterSlug }],
            },
          },
        }
      : {}),
  } satisfies Prisma.ProductWhereInput;
}

export function buildPublicProductDetailWhere(productSlug: string) {
  return {
    slug: productSlug,
    OR: [PUBLIC_STOREFRONT_PRODUCT_WHERE, PUBLIC_COLLECTOR_PRODUCT_WHERE],
  } satisfies Prisma.ProductWhereInput;
}

export function normalizeCatalogImage(path: string | null | undefined) {
  const imagePath = path?.trim();
  if (!imagePath) return "/product_placeholder.jpg";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return `/${imagePath.replace(/^\/+/, "")}`;
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
