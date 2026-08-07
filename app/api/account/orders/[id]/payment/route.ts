import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { getAccountOrderOwnershipWhere } from "@/lib/accountOrders";
import { expirePaymentOrder } from "@/lib/paymentExpiry";
import { toPaymentDto } from "@/lib/payment";
import { isRateLimited } from "@/lib/rateLimit";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) return noStoreJson({ error: "UNAUTHORIZED" }, 401);

  const { id } = await params;
  if (isRateLimited(`payment-status:${user.id}:${id}`, 30, 60_000)) {
    return noStoreJson({ error: "RATE_LIMITED" }, 429);
  }

  const findOwnedOrder = () =>
    prisma.customer_order.findFirst({
      where: { AND: [{ id }, getAccountOrderOwnershipWhere(user)] },
      select: {
        id: true,
        orderNumber: true,
        name: true,
        lastname: true,
        status: true,
        total: true,
        paymentRef: true,
        paymentExpiresAt: true,
        paidAt: true,
      },
    });

  let order = await findOwnedOrder();
  if (!order) return noStoreJson({ error: "ORDER_NOT_FOUND" }, 404);

  const now = new Date();
  if (
    order.status === "PENDING_PAYMENT" &&
    order.paidAt === null &&
    order.paymentExpiresAt !== null &&
    order.paymentExpiresAt <= now
  ) {
    await expirePaymentOrder(order.id, now);
    order = await findOwnedOrder();
    if (!order) return noStoreJson({ error: "ORDER_NOT_FOUND" }, 404);
  }

  return noStoreJson({ payment: toPaymentDto(order, now) });
}
