import prisma from "@/utils/db";
import { PUBLIC_STOREFRONT_PRODUCT_WHERE } from "@/lib/publicCatalog";

type HomepageProductWithMedia = Product & {
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

export function chooseHomepageProducts(products: Product[]) {
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
  products: Product[];
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
        rating: true,
        description: true,
        mainImage: true,
        images: true,
        manufacturer: true,
        categoryId: true,
        inStock: true,
        setId: true,
        setSlotNumber: true,
        isCollector: true,
        isBlindBox: true,
        isVisible: true,
        blindBoxSetId: true,
        category: {
          select: {
            name: true,
          },
        },
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
