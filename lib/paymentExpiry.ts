import prisma from "@/utils/db";
import {
  cancelOrder,
  OrderCancellationError,
} from "@/lib/orderCancellation";

export type PaymentExpiryBatchResult = {
  selected: number;
  expired: number;
  skipped: number;
  failed: number;
};

export async function expirePaymentOrder(orderId: string, now = new Date()) {
  try {
    return await cancelOrder({
      orderId,
      paymentExpiryAt: now,
      reason: "PAYMENT_EXPIRED",
    });
  } catch (error) {
    if (
      error instanceof OrderCancellationError &&
      (error.code === "ORDER_NOT_CANCELLABLE" ||
        error.code === "ORDER_CANCELLATION_CONFLICT")
    ) {
      return null;
    }
    throw error;
  }
}

export async function expireDuePaymentOrders(
  now = new Date(),
  batchSize = 50
): Promise<PaymentExpiryBatchResult> {
  const limit = Math.min(Math.max(Math.trunc(batchSize), 1), 100);
  const due = await prisma.customer_order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      paidAt: null,
      paymentExpiredAt: null,
      paymentExpiresAt: { lte: now },
    },
    orderBy: { paymentExpiresAt: "asc" },
    take: limit,
    select: { id: true },
  });

  const result: PaymentExpiryBatchResult = {
    selected: due.length,
    expired: 0,
    skipped: 0,
    failed: 0,
  };

  for (const order of due) {
    try {
      const expired = await expirePaymentOrder(order.id, now);
      if (expired) result.expired += 1;
      else result.skipped += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
}
