import { NextResponse } from "next/server";
import { PUBLIC_COLLECTOR_PRODUCT_WHERE } from "@/lib/publicCatalog";
import prisma from "@/utils/db";

export async function GET() {
  const rows = await prisma.featuredProduct.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: 10,
    where: {
      product: {
        ...PUBLIC_COLLECTOR_PRODUCT_WHERE,
        isBlindBox: false,
      },
    },
    select: {
      sortOrder: true,
      product: {
        select: {
          id: true,
          slug: true,
          title: true,
          mainImage: true,
          isCollector: true,
          setId: true,
          setSlotNumber: true,
        },
      },
    },
  });

  return NextResponse.json({
    items: rows.map((row) => ({
      ...row.product,
      sortOrder: row.sortOrder,
    })),
  });
}
