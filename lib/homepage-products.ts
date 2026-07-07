import prisma from "@/utils/db";
import {
  PUBLIC_COLLECTOR_PRODUCT_WHERE,
  PUBLIC_STOREFRONT_PRODUCT_WHERE,
} from "@/lib/publicCatalog";

export type HomepageProduct = {
  id: string;
  slug: string;
  title: string;
  price: number;
  mainImage: string;
  images?: string | null;
  inStock: number;
  isCollector?: boolean;
  setId?: string | null;
  setSlotNumber?: number | null;
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

export function getRandomKeychainSlots(
  featuredProducts: HomepageProduct[],
  slotCount = 10
) {
  return Array.from(
    { length: slotCount },
    (_, index): HomepageProduct | null => featuredProducts[index] ?? null
  );
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
  featuredProducts: HomepageProduct[];
  blindBoxProducts: HomepageProduct[];
  randomKeychainSlots: Array<HomepageProduct | null>;
  hasError: boolean;
}> {
  const featuredProductsPromise = prisma.featuredProduct
    .findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      take: 10,
      where: {
        product: {
          ...PUBLIC_COLLECTOR_PRODUCT_WHERE,
          isBlindBox: false,
        },
      },
      select: {
        product: {
          select: {
            id: true,
            slug: true,
            title: true,
            price: true,
            mainImage: true,
            images: true,
            inStock: true,
            isCollector: true,
            setId: true,
            setSlotNumber: true,
          },
        },
      },
    })
    .then((rows) => rows.map((row) => row.product));

  const blindBoxProductsPromise = prisma.product.findMany({
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
        setId: true,
        setSlotNumber: true,
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

  const [featuredResult, blindBoxResult] = await Promise.allSettled([
    featuredProductsPromise,
    blindBoxProductsPromise,
  ]);

  const featuredProducts =
    featuredResult.status === "fulfilled" ? featuredResult.value : [];
  const blindBoxProducts =
    blindBoxResult.status === "fulfilled" ? blindBoxResult.value : [];
  const hasError =
    featuredResult.status === "rejected" || blindBoxResult.status === "rejected";

  if (featuredResult.status === "rejected") {
    console.error(
      "[homepage] Failed to load featured collector products from MySQL:",
      featuredResult.reason
    );
  }

  if (blindBoxResult.status === "rejected") {
    console.error(
      "[homepage] Failed to load blind-box products from MySQL:",
      blindBoxResult.reason
    );
  }

  if (process.env.NODE_ENV === "development") {
    console.info(
      `[homepage] Loaded ${featuredProducts.length} featured products and ${blindBoxProducts.length} blind boxes from MySQL`
    );
  }

  return {
    featuredProducts,
    blindBoxProducts,
    randomKeychainSlots: getRandomKeychainSlots(featuredProducts),
    hasError,
  };
}
