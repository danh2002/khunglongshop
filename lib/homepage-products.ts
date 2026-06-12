import prisma from "@/utils/db";
import { PUBLIC_STOREFRONT_PRODUCT_WHERE } from "@/lib/publicCatalog";

export function chooseHomepageProducts(products: Product[]) {
  return products;
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
    const variantImages =
      products[0]?.blindBoxSet?.poolVersions[0]?.entries.map(
        (entry) => entry.product.mainImage
      ) ?? [];

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
