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
      if (!order) throw new PaymentConfirmationError("ORDER_NOT_FOUND");
      if (order.status === "PROCESSING" && order.paidAt) return order;
      if (
        order.status !== "PENDING_PAYMENT" ||
        order.paidAt !== null ||
        order.paymentExpiredAt !== null ||
        order.paymentExpiresAt === null ||
        order.paymentExpiresAt < now
      ) {
        throw new PaymentConfirmationError("PAYMENT_NOT_CONFIRMABLE");
      }

      const updated = await tx.customer_order.updateMany({
        where: {
          id: order.id,
          status: "PENDING_PAYMENT",
          paidAt: null,
          paymentExpiredAt: null,
          paymentExpiresAt: { gte: now },
        },
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

      await enqueueOrderSheetSync(tx, order.id);

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
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
  );
  await bestEffortFlushOrderSheetSync(input.orderId);
  return confirmed;
}
