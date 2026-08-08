import { Prisma } from "@prisma/client";
import {
  InventoryReservationError,
  reserveInventoryForItems,
  type PrismaTransaction,
} from "@/lib/orderInventory";
import prisma from "@/utils/db";
import {
  bestEffortFlushOrderSheetSync,
  enqueueOrderSheetSync,
} from "@/lib/orderSheetSync";

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

const restorationInclude = {
  products: {
    include: {
      product: { select: { isBlindBox: true } },
      blindBoxAllocations: {
        include: {
          redemptionCode: {
            select: { id: true, allocationId: true, orderId: true, status: true },
          },
        },
      },
    },
  },
  blindBoxAllocations: { select: { id: true, orderItemId: true } },
  redemptionCodes: {
    select: { id: true, allocationId: true, orderId: true, status: true },
  },
} satisfies Prisma.Customer_orderInclude;

export type RestorableOrder = Prisma.Customer_orderGetPayload<{
  include: typeof restorationInclude;
}>;

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const expected = new Set(right);
  return left.every((id) => expected.has(id));
}

export async function loadRestorableOrder(
  tx: PrismaTransaction,
  orderId: string
) {
  return tx.customer_order.findUnique({
    where: { id: orderId },
    include: restorationInclude,
  });
}

function collectRestorationIds(order: RestorableOrder) {
  const allocationIds: string[] = [];
  const redemptionCodeIds: string[] = [];

  for (const item of order.products) {
    const allocations = item.blindBoxAllocations;
    if (!item.product.isBlindBox && allocations.length > 0) {
      throw new OrderRestorationError("ORDER_RESTORATION_DATA_INVALID");
    }
    if (item.product.isBlindBox && allocations.length !== item.quantity) {
      throw new OrderRestorationError("ORDER_RESTORATION_DATA_INVALID");
    }

    for (const allocation of allocations) {
      if (allocation.status !== "VOIDED" || allocation.voidedAt === null) {
        throw new OrderRestorationError("ORDER_RESTORATION_DATA_INVALID");
      }
      allocationIds.push(allocation.id);
      const code = allocation.redemptionCode;
      if (!code) continue;
      if (
        code.allocationId !== allocation.id ||
        code.orderId !== order.id ||
        code.status !== "CANCELLED"
      ) {
        throw new OrderRestorationError("ORDER_RESTORATION_DATA_INVALID");
      }
      redemptionCodeIds.push(code.id);
    }
  }

  const allAllocationIds = order.blindBoxAllocations.map(({ id }) => id);
  const allCodeIds = order.redemptionCodes.map(({ id }) => id);
  if (
    !sameIds(allocationIds, allAllocationIds) ||
    !sameIds(redemptionCodeIds, allCodeIds)
  ) {
    throw new OrderRestorationError("ORDER_RESTORATION_DATA_INVALID");
  }

  return { allocationIds, redemptionCodeIds };
}

function validateRestorableOrder(order: RestorableOrder) {
  if (order.status !== "CANCELLED") {
    throw new OrderRestorationError("ORDER_NOT_CANCELLED");
  }
  if (order.redemptionCodes.some(({ status }) => status === "REDEEMED")) {
    throw new OrderRestorationError("ORDER_HAS_REDEEMED_CODE");
  }
  if (order.redemptionCodes.some(({ status }) => status === "DISABLED")) {
    throw new OrderRestorationError("ORDER_HAS_DISABLED_CODE");
  }
}

async function restoreAllocations(
  tx: PrismaTransaction,
  allocationIds: string[],
  redemptionCodeIds: string[]
) {
  if (allocationIds.length === 0) return;
  const allocations = await tx.blindBoxAllocation.updateMany({
    where: { id: { in: allocationIds }, status: "VOIDED" },
    data: { status: "ACTIVE", voidedAt: null },
  });
  if (allocations.count !== allocationIds.length) {
    throw new OrderRestorationError("ORDER_RESTORATION_DATA_INVALID");
  }

  if (redemptionCodeIds.length === 0) return;
  const codes = await tx.redemptionCode.updateMany({
    where: { id: { in: redemptionCodeIds }, status: "CANCELLED" },
    data: { status: "ACTIVE", isUsed: false, usedAt: null },
  });
  if (codes.count !== redemptionCodeIds.length) {
    throw new OrderRestorationError("ORDER_RESTORATION_DATA_INVALID");
  }
}

export async function restoreCancelledOrderResources(
  order: RestorableOrder,
  tx: PrismaTransaction
) {
  validateRestorableOrder(order);
  const ids = collectRestorationIds(order);
  try {
    await reserveInventoryForItems(order.products, tx);
  } catch (error) {
    if (error instanceof InventoryReservationError) {
      throw new OrderRestorationError("INSUFFICIENT_STOCK");
    }
    throw error;
  }
  await restoreAllocations(tx, ids.allocationIds, ids.redemptionCodeIds);
  return ids;
}

export async function restoreCancelledOrder(input: {
  orderId: string;
  adminActorId: string;
}) {
  try {
    const restored = await prisma.$transaction(
      async (tx) => {
        const order = await loadRestorableOrder(tx, input.orderId);
        if (!order) throw new OrderRestorationError("ORDER_NOT_FOUND");
        const ids = await restoreCancelledOrderResources(order, tx);
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
              allocationCount: ids.allocationIds.length,
              redemptionCodeCount: ids.redemptionCodeIds.length,
            },
          },
        });
        const restored = await tx.customer_order.findUnique({
          where: { id: order.id },
        });
        if (!restored) throw new OrderRestorationError("ORDER_NOT_FOUND");
        return restored;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 }
    );
    try {
      await enqueueOrderSheetSync(prisma, input.orderId);
    } catch (e) {
      console.warn("[order-sheet-sync] enqueue failed after restore:", e);
    }
    await bestEffortFlushOrderSheetSync(input.orderId);
    return restored;
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
