import { NextResponse } from "next/server";
import { z } from "zod";
import { isPubliclySellableProduct } from "@/lib/publicCatalog";
import prisma from "@/utils/db";

const requestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.number().int().min(1).max(99),
        clientPrice: z.number().int().min(0).optional(),
      })
    )
    .min(1)
    .max(20)
    .refine(
      (items) => new Set(items.map((item) => item.productId)).size === items.length,
      "DUPLICATE_PRODUCT_ID"
    ),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const products = await prisma.product.findMany({
    where: { id: { in: parsed.data.items.map((item) => item.productId) } },
    select: {
      id: true,
      slug: true,
      price: true,
      inStock: true,
      isVisible: true,
      isBlindBox: true,
      isCollector: true,
    },
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  const items = parsed.data.items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) {
      return {
        productId: item.productId,
        status: "NOT_FOUND" as const,
        currentPrice: 0,
        priceChanged: item.clientPrice !== undefined && item.clientPrice !== 0,
      };
    }

    const status = !isPubliclySellableProduct(product)
      ? ("HIDDEN" as const)
      : product.inStock < item.quantity
        ? ("OUT_OF_STOCK" as const)
        : ("OK" as const);

    return {
      productId: item.productId,
      status,
      currentPrice: product.price,
      priceChanged:
        item.clientPrice !== undefined && item.clientPrice !== product.price,
    };
  });

  return NextResponse.json({
    valid: items.every((item) => item.status === "OK"),
    items,
  });
}
