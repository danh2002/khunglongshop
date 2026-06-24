import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  hashCheckoutPayload,
  selectWeightedEntry,
  validateBlindBoxPool,
} from "@/lib/blindBox";
import { generateRedemptionCode } from "@/lib/codes";
import { isRateLimited } from "@/lib/rateLimit";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";
import { isPubliclySellableProduct } from "@/lib/publicCatalog";

const itemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(99),
});

const shippingSchema = z.object({
  name: z.string().trim().min(2).max(50),
  lastname: z.string().trim().min(2).max(50),
  phone: z.string().trim().min(10).max(20),
  email: z.string().trim().email().max(254),
  company: z.string().trim().min(1).max(200),
  address: z.string().trim().min(5).max(200),
  apartment: z.string().trim().min(1).max(200),
  city: z.string().trim().min(2).max(200),
  country: z.string().trim().min(2).max(200),
  postalCode: z.string().trim().min(3).max(20),
  orderNotice: z.string().trim().max(500).optional().default(""),
});

const createOrderSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(128),
  shipping: shippingSchema,
  items: z.array(itemSchema).min(1).max(20),
});

type OrderResponse = {
  order: {
    id: string;
    orderNumber: number;
    status: "PROCESSING";
    total: number;
    createdAt: string;
    items: Array<{
      id: string;
      productId: string;
      title: string;
      slug: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }>;
  };
  blindBoxResults: Array<{
    allocationId: string;
    orderItemId: string;
    unitIndex: number;
    poolVersionId: string;
    setId: string;
    product: {
      id: string;
      title: string;
      slug: string;
      image: string;
      slotNumber: number;
    };
    rarityTier: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
    redemptionCode: string;
  }>;
};

function errorResponse(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

async function createUniqueCode(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateRedemptionCode();
    const existing = await tx.redemptionCode.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  throw new Error("REDEMPTION_CODE_GENERATION_FAILED");
}

function mergeItems(items: z.infer<typeof itemSchema>[]) {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity
    );
  }

  return [...quantities.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((left, right) => left.productId.localeCompare(right.productId));
}

async function loadOrderResponse(
  tx: Prisma.TransactionClient | typeof prisma,
  orderId: string
): Promise<OrderResponse> {
  const order = await tx.customer_order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      products: { orderBy: { id: "asc" } },
      blindBoxAllocations: {
        where: { status: "ACTIVE" },
        orderBy: [{ orderItemId: "asc" }, { unitIndex: "asc" }],
        include: {
          product: true,
          poolVersion: { select: { collectorSetId: true } },
          redemptionCode: { select: { code: true } },
        },
      },
    },
  });

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: "PROCESSING",
      total: order.total,
      createdAt: (order.dateTime ?? new Date()).toISOString(),
      items: order.products.map((item) => ({
        id: item.id,
        productId: item.productId,
        title: item.productTitle,
        slug: item.productSlug,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.unitPrice * item.quantity,
      })),
    },
    blindBoxResults: order.blindBoxAllocations.map((allocation) => ({
      allocationId: allocation.id,
      orderItemId: allocation.orderItemId,
      unitIndex: allocation.unitIndex,
      poolVersionId: allocation.poolVersionId,
      setId: allocation.poolVersion.collectorSetId,
      product: {
        id: allocation.product.id,
        title: allocation.product.title,
        slug: allocation.product.slug,
        image: allocation.product.mainImage,
        slotNumber: allocation.product.setSlotNumber ?? 0,
      },
      rarityTier: allocation.rarityTier,
      redemptionCode: allocation.redemptionCode?.code ?? "",
    })),
  };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const sessionEmail = session?.user?.email?.trim().toLowerCase();

  if (!userId || !sessionEmail) {
    return errorResponse(401, "UNAUTHORIZED");
  }

  if (isRateLimited(`blind-box-order:${userId}`, 5)) {
    return errorResponse(429, "RATE_LIMITED");
  }

  const parsed = createOrderSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  if (parsed.data.shipping.email.toLowerCase() !== sessionEmail) {
    return errorResponse(403, "ORDER_EMAIL_MISMATCH");
  }

  const items = mergeItems(parsed.data.items);
  if (items.some((item) => item.quantity > 99)) {
    return errorResponse(400, "INVALID_REQUEST");
  }

  const canonicalPayload = {
    userId,
    shipping: {
      ...parsed.data.shipping,
      email: sessionEmail,
    },
    items,
  };
  const requestHash = hashCheckoutPayload(canonicalPayload);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.customer_order.findFirst({
          where: {
            userId,
            checkoutIdempotencyKey: parsed.data.idempotencyKey,
          },
          select: { id: true, checkoutRequestHash: true },
        });

        if (existing) {
          if (existing.checkoutRequestHash !== requestHash) {
            throw new Error("IDEMPOTENCY_KEY_REUSED");
          }
          return loadOrderResponse(tx, existing.id);
        }

        const products = await tx.product.findMany({
          where: { id: { in: items.map((item) => item.productId) } },
          include: {
            blindBoxSet: {
              include: {
                poolVersions: {
                  where: { status: "ACTIVE" },
                  take: 2,
                  include: {
                    entries: {
                      orderBy: { slotNumber: "asc" },
                      include: { product: true },
                    },
                  },
                },
              },
            },
          },
        });

        if (products.length !== items.length) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        const productById = new Map(products.map((product) => [product.id, product]));
        let total = 0;
        for (const item of items) {
          const product = productById.get(item.productId);
          if (!product) throw new Error("PRODUCT_NOT_FOUND");
          if (!isPubliclySellableProduct(product)) {
            console.warn("[checkout] Rejected non-sellable product", {
              productId: product.id,
              slug: product.slug,
              userId,
            });
            throw new Error("PRODUCT_NOT_SELLABLE");
          }
          if (product.price <= 0) throw new Error("INVALID_PRODUCT_PRICE");
          if (product.inStock < item.quantity) throw new Error("INSUFFICIENT_STOCK");

          if (product.isBlindBox) {
            const versions = product.blindBoxSet?.poolVersions ?? [];
            if (versions.length !== 1) throw new Error("BLIND_BOX_POOL_UNAVAILABLE");
            const validation = validateBlindBoxPool(
              versions[0].entries.map((entry) => ({
                productId: entry.productId,
                slotNumber: entry.slotNumber,
                drawWeight: entry.drawWeight,
                rarityTier: entry.rarityTier,
              }))
            );
            if (!validation.valid) throw new Error("BLIND_BOX_POOL_UNAVAILABLE");
          }

          total += product.price * item.quantity;
        }

        const shipping = canonicalPayload.shipping;
        const order = await tx.customer_order.create({
          data: {
            userId,
            checkoutIdempotencyKey: parsed.data.idempotencyKey,
            checkoutRequestHash: requestHash,
            name: shipping.name,
            lastname: shipping.lastname,
            phone: shipping.phone,
            email: shipping.email,
            company: shipping.company,
            adress: shipping.address,
            apartment: shipping.apartment,
            postalCode: shipping.postalCode,
            city: shipping.city,
            country: shipping.country,
            orderNotice: shipping.orderNotice,
            total,
            status: "PENDING_PAYMENT",
          },
        });

        for (const item of items) {
          const product = productById.get(item.productId)!;
          const poolVersion = product.isBlindBox
            ? product.blindBoxSet!.poolVersions[0]
            : null;

          const stockUpdate = await tx.product.updateMany({
            where: {
              id: product.id,
              inStock: { gte: item.quantity },
            },
            data: { inStock: { decrement: item.quantity } },
          });
          if (stockUpdate.count !== 1) throw new Error("INSUFFICIENT_STOCK");

          const orderItem = await tx.customer_order_product.create({
            data: {
              customerOrderId: order.id,
              productId: product.id,
              quantity: item.quantity,
              productTitle: product.title,
              productSlug: product.slug,
              unitPrice: product.price,
              snapshotSource: "CHECKOUT",
              poolVersionId: poolVersion?.id ?? null,
            },
          });

          if (!poolVersion) continue;

          for (let unitIndex = 1; unitIndex <= item.quantity; unitIndex += 1) {
            const selected = selectWeightedEntry(poolVersion.entries);
            const allocation = await tx.blindBoxAllocation.create({
              data: {
                allocationKey: `${orderItem.id}:${unitIndex}`,
                orderId: order.id,
                orderItemId: orderItem.id,
                unitIndex,
                userId,
                productId: selected.productId,
                poolVersionId: poolVersion.id,
                rarityTier: selected.rarityTier,
                revealed: true,
              },
            });

            await tx.redemptionCode.create({
              data: {
                code: await createUniqueCode(tx),
                productId: selected.productId,
                allocationId: allocation.id,
                orderId: order.id,
                userId,
                status: "ACTIVE",
                isUsed: false,
              },
            });
          }
        }

        await tx.customer_order.update({
          where: { id: order.id },
          data: { status: "PROCESSING" },
        });

        return loadOrderResponse(tx, order.id);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 20_000,
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.customer_order.findFirst({
        where: {
          userId,
          checkoutIdempotencyKey: parsed.data.idempotencyKey,
        },
        select: { id: true, checkoutRequestHash: true },
      });

      if (existing) {
        if (existing.checkoutRequestHash !== requestHash) {
          return errorResponse(409, "IDEMPOTENCY_KEY_REUSED");
        }
        const response = await loadOrderResponse(prisma, existing.id);
        return NextResponse.json(response, { status: 200 });
      }
    }

    const code = error instanceof Error ? error.message : "ORDER_CREATION_FAILED";
    const status =
      code === "PRODUCT_NOT_FOUND"
        ? 404
        : code === "PRODUCT_NOT_SELLABLE"
          ? 422
        : code === "IDEMPOTENCY_KEY_REUSED" ||
            code === "INSUFFICIENT_STOCK"
          ? 409
          : code === "BLIND_BOX_POOL_UNAVAILABLE" ||
              code === "INVALID_PRODUCT_PRICE"
            ? 422
            : 500;

    if (status === 500) console.error("Atomic checkout failed:", error);
    return errorResponse(status, code);
  }
}
