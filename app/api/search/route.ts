import { NextRequest, NextResponse } from "next/server";
import {
  PUBLIC_STOREFRONT_PRODUCT_WHERE,
  toPublicCatalogProduct,
} from "@/lib/publicCatalog";
import prisma from "@/utils/db";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  const products = await prisma.product.findMany({
    where: {
      ...PUBLIC_STOREFRONT_PRODUCT_WHERE,
      ...(query
        ? {
            OR: [
              { title: { contains: query } },
              { description: { contains: query } },
              ...( /^vanie(?:\s|-)?(?:[1-9]|10)$/i.test(query)
                ? [{ slug: "vanie-blind-box" }]
                : []),
            ],
          }
        : {}),
    },
    orderBy: { title: "asc" },
    take: 24,
    select: {
      id: true,
      slug: true,
      title: true,
      price: true,
      mainImage: true,
      inStock: true,
      categoryId: true,
      setId: true,
      isVisible: true,
      isBlindBox: true,
      isCollector: true,
    },
  });

  return NextResponse.json(products.map(toPublicCatalogProduct));
}
