import { Prisma } from "@prisma/client";
import prisma from "@/utils/db";

export class OrderCancellationError extends Error {
  constructor(
    public code:
      | "ORDER_NOT_FOUND"
      | "ORDER_NOT_CANCELLABLE"
      | "ORDER_REQUIRES_ADMIN_CANCELLATION"
  ) {
    super(code);
    this.name = "OrderCancellationError";
  }
}

export async function cancelOrder(input: {
  orderId: string;
  ownerId?: string;
  adminActorId?: string;
  reason?: string;
}) {
  return prisma.$transaction(
    async (tx) => {
      const order = await tx.customer_order.findFirst({
        where: {
          id: input.orderId,
          ...(input.ownerId ? { userId: input.ownerId } : {}),
        },
        include: {
          products: true,
          redemptionCodes: { select: { id: true, status: true } },
        },
      });

      if (!order) throw new OrderCancellationError("ORDER_NOT_FOUND");
      if (order.status === "CANCELLED") return order;
      if (order.status === "COMPLETED") {
        throw new OrderCancellationError("ORDER_NOT_CANCELLABLE");
      }

      const hasRedeemedCode = order.redemptionCodes.some(
        (code) => code.status === "REDEEMED"
      );
      if (hasRedeemedCode && !input.adminActorId) {
        throw new OrderCancellationError(
          "ORDER_REQUIRES_ADMIN_CANCELLATION"
        );
      }

      await tx.blindBoxAllocation.updateMany({
        where: { orderId: order.id, status: "ACTIVE" },
        data: { status: "VOIDED", voidedAt: new Date() },
      });
      await tx.redemptionCode.updateMany({
        where: { orderId: order.id, status: "ACTIVE" },
        data: { status: "CANCELLED", isUsed: false },
      });

      for (const item of order.products) {
        await tx.product.update({
          where: { id: item.productId },
          data: { inStock: { increment: item.quantity } },
        });
      }

      const cancelled = await tx.customer_order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });

      if (input.adminActorId) {
        await tx.adminAuditLog.create({
          data: {
            actorId: input.adminActorId,
            action: "ORDER_CANCELLED",
            entityType: "Customer_order",
            entityId: order.id,
            metadata: {
              reason: input.reason || "Không có lý do",
              hadRedeemedCode: hasRedeemedCode,
            },
          },
        });
      }

      return cancelled;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
  );
}

