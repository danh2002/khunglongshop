import { Prisma } from "@prisma/client";
import prisma from "@/utils/db";
import {
  bestEffortFlushOrderSheetSync,
  enqueueOrderSheetSync,
} from "@/lib/orderSheetSync";

export class PaymentConfirmationError extends Error {
  constructor(
    public readonly code:
      | "ORDER_NOT_FOUND"
      | "PAYMENT_NOT_CONFIRMABLE"
      | "PAYMENT_CONFIRMATION_CONFLICT"
  ) {
    super(code);
    this.name = "PaymentConfirmationError";
  }
}

export async function confirmOrderPayment(input: {
  orderId: string;
  adminActorId: string;
  now?: Date;
  afterStatusChange?: (
    tx: Prisma.TransactionClient,
    order: { id: string; status: "PROCESSING" }
  ) => Promise<void>;
}) {
  const now = input.now ?? new Date();

  const confirmed = await prisma.$transaction(
    async (tx) => {
      const order = await tx.customer_order.findUnique({
        where: { id: input.orderId },
      });
      if (!order) {
        throw new PaymentConfirmationError("ORDER_NOT_FOUND");
      }

      if (order.status !== "PENDING_PAYMENT" && order.status !== "PROCESSING") {
        throw new PaymentConfirmationError("PAYMENT_NOT_CONFIRMABLE");
      }

      // If already has a paid timestamp, treat as already confirmed and return.
      if (order.paidAt) {
        return order;
      }

      const updated = await tx.customer_order.updateMany({
        where:
          order.status === "PENDING_PAYMENT"
            ? {
                id: order.id,
                status: "PENDING_PAYMENT",
                paidAt: null,
              }
            : { id: order.id, status: "PROCESSING", paidAt: null },
        data: { status: "PROCESSING", paidAt: now },
      });
      if (updated.count !== 1) {
        throw new PaymentConfirmationError("PAYMENT_CONFIRMATION_CONFLICT");
      }

      await tx.adminAuditLog.create({
        data: {
          actorId: input.adminActorId,
          action: "PAYMENT_CONFIRMED",
          entityType: "Customer_order",
          entityId: order.id,
          metadata: {
            paymentRef: order.paymentRef,
            previousStatus: order.status,
            nextStatus: "PROCESSING",
            paidAt: now.toISOString(),
          },
        },
      });

      const confirmed = await tx.customer_order.findUnique({
        where: { id: order.id },
      });
      if (!confirmed) throw new PaymentConfirmationError("ORDER_NOT_FOUND");
      if (input.afterStatusChange) {
        await input.afterStatusChange(tx, {
          id: confirmed.id,
          status: "PROCESSING",
        });
      }
      return confirmed;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 }
  );
  try {
    await enqueueOrderSheetSync(prisma, input.orderId);
  } catch (e) {
    console.warn("[order-sheet-sync] enqueue failed after payment confirmation:", e);
  }
  await bestEffortFlushOrderSheetSync(input.orderId);
  return confirmed;
}
