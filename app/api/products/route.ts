import { NextRequest, NextResponse } from "next/server";
import {
  buildPublicProductListResponse,
  buildPublicStorefrontWhere,
  PUBLIC_CATALOG_PAGE_SIZE,
} from "@/lib/publicCatalog";
import prisma from "@/utils/db";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  if (searchParams.has("mode")) {
    return NextResponse.json({ error: "UNSUPPORTED_QUERY_PARAMETER" }, { status: 400 });
  }

  const rawPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = PUBLIC_CATALOG_PAGE_SIZE;
  const where = buildPublicStorefrontWhere({
    categorySlug: searchParams.get("category"),
    characterSlug: searchParams.get("nhanvat"),
  });

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ title: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
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
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json(
    buildPublicProductListResponse(products, page, total, pageSize)
  );
}
