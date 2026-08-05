import { Prisma } from "@prisma/client";
import prisma from "@/utils/db";

export type OrderRestorationErrorCode =
  | "ORDER_NOT_FOUND"
  | "ORDER_NOT_CANCELLED"
  | "ORDER_HAS_REDEEMED_CODE"
  | "ORDER_HAS_DISABLED_CODE"
  | "ORDER_RESTORATION_DATA_INVALID"
  | "INSUFFICIENT_STOCK"
  | "ORDER_RESTORATION_CONFLICT";

export class OrderRestorationError extends Error {
  constructor(public code: OrderRestorationErrorCode) {
    super(code);
    this.name = "OrderRestorationError";
  }
}

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const expected = new Set(right);
  return left.every((id) => expected.has(id));
}

export async function restoreCancelledOrder(input: {
  orderId: string;
  adminActorId: string;
}) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const order = await tx.customer_order.findUnique({
          where: { id: input.orderId },
          include: {
            products: {
              include: {
                product: { select: { isBlindBox: true } },
                blindBoxAllocations: {
                  include: {
                    redemptionCode: {
                      select: {
                        id: true,
                        allocationId: true,
                        orderId: true,
                        status: true,
                      },
                    },
                  },
                },
              },
            },
            blindBoxAllocations: {
              select: { id: true, orderItemId: true },
            },
            redemptionCodes: {
              select: {
                id: true,
                allocationId: true,
                orderId: true,
                status: true,
              },
            },
          },
        });

        if (!order) throw new OrderRestorationError("ORDER_NOT_FOUND");
        if (order.status !== "CANCELLED") {
          throw new OrderRestorationError("ORDER_NOT_CANCELLED");
        }
        if (order.redemptionCodes.some((code) => code.status === "REDEEMED")) {
          throw new OrderRestorationError("ORDER_HAS_REDEEMED_CODE");
        }
        if (order.redemptionCodes.some((code) => code.status === "DISABLED")) {
          throw new OrderRestorationError("ORDER_HAS_DISABLED_CODE");
        }

        const allocationIds: string[] = [];
        const redemptionCodeIds: string[] = [];

        for (const item of order.products) {
          const allocations = item.blindBoxAllocations;
          if (!item.product.isBlindBox && allocations.length > 0) {
            throw new OrderRestorationError(
              "ORDER_RESTORATION_DATA_INVALID"
            );
          }
          if (item.product.isBlindBox && allocations.length !== item.quantity) {
            throw new OrderRestorationError(
              "ORDER_RESTORATION_DATA_INVALID"
            );
          }

          for (const allocation of allocations) {
            const code = allocation.redemptionCode;
            if (
              allocation.status !== "VOIDED" ||
              allocation.voidedAt === null
            ) {
              throw new OrderRestorationError(
                "ORDER_RESTORATION_DATA_INVALID"
              );
            }
            allocationIds.push(allocation.id);
            if (code) {
              if (
                code.allocationId !== allocation.id ||
                code.orderId !== order.id ||
                code.status !== "CANCELLED"
              ) {
                throw new OrderRestorationError(
                  "ORDER_RESTORATION_DATA_INVALID"
                );
              }
              redemptionCodeIds.push(code.id);
            }
          }
        }

        if (
          !sameIds(
            allocationIds,
            order.blindBoxAllocations.map((allocation) => allocation.id)
          ) ||
          !sameIds(
            redemptionCodeIds,
            order.redemptionCodes.map((code) => code.id)
          )
        ) {
          throw new OrderRestorationError("ORDER_RESTORATION_DATA_INVALID");
        }

        for (const item of order.products) {
          const reserved = await tx.product.updateMany({
            where: {
              id: item.productId,
              inStock: { gte: item.quantity },
            },
            data: { inStock: { decrement: item.quantity } },
          });
          if (reserved.count !== 1) {
            throw new OrderRestorationError("INSUFFICIENT_STOCK");
          }
        }

        if (allocationIds.length > 0) {
          const restoredAllocations = await tx.blindBoxAllocation.updateMany({
            where: { id: { in: allocationIds }, status: "VOIDED" },
            data: { status: "ACTIVE", voidedAt: null },
          });
          if (restoredAllocations.count !== allocationIds.length) {
            throw new OrderRestorationError(
              "ORDER_RESTORATION_DATA_INVALID"
            );
          }

          if (redemptionCodeIds.length > 0) {
            const restoredCodes = await tx.redemptionCode.updateMany({
              where: { id: { in: redemptionCodeIds }, status: "CANCELLED" },
              data: { status: "ACTIVE", isUsed: false, usedAt: null },
            });
            if (restoredCodes.count !== redemptionCodeIds.length) {
              throw new OrderRestorationError(
                "ORDER_RESTORATION_DATA_INVALID"
              );
            }
          }
        }

        const restoredStatus = await tx.customer_order.updateMany({
          where: { id: order.id, status: "CANCELLED" },
          data: { status: "PENDING_PAYMENT" },
        });
        if (restoredStatus.count !== 1) {
          throw new OrderRestorationError("ORDER_RESTORATION_CONFLICT");
        }

        await tx.adminAuditLog.create({
          data: {
            actorId: input.adminActorId,
            action: "ORDER_RESTORED",
            entityType: "Customer_order",
            entityId: order.id,
            metadata: {
              previousStatus: "CANCELLED",
              nextStatus: "PENDING_PAYMENT",
              inventoryLineCount: order.products.length,
              allocationCount: allocationIds.length,
              redemptionCodeCount: redemptionCodeIds.length,
            },
          },
        });

        const restored = await tx.customer_order.findUnique({
          where: { id: order.id },
        });
        if (!restored) throw new OrderRestorationError("ORDER_NOT_FOUND");
        return restored;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new OrderRestorationError("ORDER_RESTORATION_CONFLICT");
    }
    throw error;
  }
}
