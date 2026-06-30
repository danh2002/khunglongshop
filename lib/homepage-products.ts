import prisma from "@/utils/db";
import { PUBLIC_STOREFRONT_PRODUCT_WHERE } from "@/lib/publicCatalog";

export type HomepageProduct = {
  id: string;
  slug: string;
  title: string;
  price: number;
  mainImage: string;
  images?: string | null;
  inStock: number;
  isCollector?: boolean;
  blindBoxSet?: {
    poolVersions?: Array<{
      entries?: Array<{
        product: {
          mainImage: string | null;
        };
      }>;
    }>;
  } | null;
};

type HomepageProductWithMedia = HomepageProduct & {
  images?: string | null;
  blindBoxSet?: {
    poolVersions?: Array<{
      entries?: Array<{
        product: {
          mainImage: string | null;
        };
      }>;
    }>;
  } | null;
};

export function chooseHomepageProducts(products: HomepageProduct[]) {
  return products;
}

function parseHomepageGalleryImages(images: string | null | undefined) {
  if (!images) return [];

  try {
    const parsed: unknown = JSON.parse(images);
    return Array.isArray(parsed) && parsed.every((image) => typeof image === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function uniqueImages(images: Array<string | null | undefined>) {
  return images.reduce<string[]>((unique, image) => {
    if (!image || unique.includes(image)) return unique;
    return [...unique, image];
  }, []);
}

export function getHomepageVariantImages(product: HomepageProductWithMedia | null | undefined) {
  const poolImages =
    product?.blindBoxSet?.poolVersions?.[0]?.entries?.map(
      (entry) => entry.product.mainImage
    ) ?? [];
  const galleryImages = parseHomepageGalleryImages(product?.images);

  return uniqueImages([...poolImages, ...galleryImages]);
}

export async function getHomepageProducts(): Promise<{
  products: HomepageProduct[];
  variantImages: string[];
  hasError: boolean;
}> {
  try {
    const products = await prisma.product.findMany({
      where: PUBLIC_STOREFRONT_PRODUCT_WHERE,
      take: 8,
      select: {
        id: true,
        slug: true,
        title: true,
        price: true,
        mainImage: true,
        images: true,
        inStock: true,
        isCollector: true,
        blindBoxSet: {
          select: {
            poolVersions: {
              where: { status: "ACTIVE" },
              take: 1,
              select: {
                entries: {
                  orderBy: { slotNumber: "asc" },
                  take: 4,
                  select: {
                    product: {
                      select: { mainImage: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const variantImages = getHomepageVariantImages(products[0]);

    if (process.env.NODE_ENV === "development") {
      console.info(`[homepage] Loaded ${products.length} products from MySQL`);
    }

    return {
      products,
      variantImages,
      hasError: false,
    };
  } catch (error) {
    console.error("[homepage] Failed to load products from MySQL:", error);

    return {
      products: [],
      variantImages: [],
      hasError: true,
    };
  }
}
