import type { Prisma } from "@prisma/client";

export type OrderItem = {
  productId: string;
  quantity: number;
};

export type PrismaTransaction = Prisma.TransactionClient;

export class InventoryReservationError extends Error {
  readonly code = "INSUFFICIENT_STOCK" as const;

  constructor(public readonly productId: string) {
    super("INSUFFICIENT_STOCK");
    this.name = "InventoryReservationError";
  }
}

export async function reserveInventoryForItems(
  items: OrderItem[],
  tx: PrismaTransaction
): Promise<void> {
  for (const item of items) {
    const reserved = await tx.product.updateMany({
      where: {
        id: item.productId,
        inStock: { gte: item.quantity },
      },
      data: { inStock: { decrement: item.quantity } },
    });
    if (reserved.count !== 1) {
      throw new InventoryReservationError(item.productId);
    }
  }
}
