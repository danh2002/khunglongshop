import { Prisma } from "@prisma/client";
import {
  isPrismaPaymentRefConflict,
  PAYMENT_WINDOW_MS,
  PaymentError,
  withPaymentRefRetry,
} from "@/lib/payment";
import {
  loadRestorableOrder,
  OrderRestorationError,
  restoreCancelledOrderResources,
} from "@/lib/orderRestoration";
import prisma from "@/utils/db";
import {
  bestEffortFlushOrderSheetSync,
  enqueueOrderSheetSync,
} from "@/lib/orderSheetSync";

export async function renewOrderPayment(input: {
  orderId: string;
  ownerId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  try {
    const renewed = await withPaymentRefRetry(
      (newRef) =>
        prisma.$transaction(
          async (tx) => {
            const order = await loadRestorableOrder(tx, input.orderId);
            if (!order || order.userId !== input.ownerId) {
              throw new OrderRestorationError("ORDER_NOT_FOUND");
            }
            if (order.paidAt !== null || order.paymentExpiredAt === null) {
              throw new PaymentError("PAYMENT_NOT_RENEWABLE");
            }

            const oldRef = order.paymentRef;
            const newExpiresAt = new Date(now.getTime() + PAYMENT_WINDOW_MS);
            await restoreCancelledOrderResources(order, tx);
            const reactivated = await tx.customer_order.updateMany({
              where: {
                id: order.id,
                userId: input.ownerId,
                status: "CANCELLED",
                paidAt: null,
                paymentExpiredAt: { not: null },
              },
              data: {
                status: "PENDING_PAYMENT",
                paymentRef: newRef,
                paymentExpiresAt: newExpiresAt,
                paymentExpiredAt: null,
              },
            });
            if (reactivated.count !== 1) {
              throw new PaymentError("PAYMENT_CONFLICT");
            }

            await tx.adminAuditLog.create({
              data: {
                actorId: input.ownerId,
                action: "QR_RENEWED",
                entityType: "Customer_order",
                entityId: order.id,
                metadata: {
                  oldRef,
                  newRef,
                  newExpiresAt: newExpiresAt.toISOString(),
                },
              },
            });
            const renewed = await tx.customer_order.findUnique({
              where: { id: order.id },
            });
            if (!renewed) throw new OrderRestorationError("ORDER_NOT_FOUND");
            return renewed;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 }
        ),
      isPrismaPaymentRefConflict
    );
    try {
      await enqueueOrderSheetSync(prisma, renewed.id);
    } catch (e) {
      console.warn("[order-sheet-sync] enqueue failed after renewal:", e);
    }
    await bestEffortFlushOrderSheetSync(input.orderId);
    return renewed;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new PaymentError("PAYMENT_CONFLICT");
    }
    throw error;
  }
}
