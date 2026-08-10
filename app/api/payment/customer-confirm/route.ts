import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import prisma from "@/utils/db";
import { authOptions } from "@/utils/authOptions";
import { getAccountOrderOwnershipWhere } from "@/lib/accountOrders";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const ownerId = session?.user?.id;
  if (!ownerId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : null;
  const claimedRef = typeof body?.claimedRef === "string" ? body.claimedRef.trim() : null;
  if (!orderId || !claimedRef) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  // Find order belonging to the current user (or legacy email owner)
  const order = await prisma.customer_order.findFirst({
    where: { AND: [{ id: orderId }, getAccountOrderOwnershipWhere(session.user as any)] },
    select: { id: true, orderNumber: true, status: true, paymentExpiresAt: true, paidAt: true, total: true },
  });
  if (!order) return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });

  const now = new Date();
  if (order.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "ORDER_NOT_AWAITING_PAYMENT" }, { status: 409 });
  }
  if (order.paidAt !== null) {
    return NextResponse.json({ error: "ORDER_NOT_AWAITING_PAYMENT" }, { status: 409 });
  }
  if (!order.paymentExpiresAt || order.paymentExpiresAt <= now) {
    return NextResponse.json({ error: "PAYMENT_QR_EXPIRED" }, { status: 409 });
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const updated = await tx.customer_order.updateMany({
          where: {
            id: order.id,
            status: "PENDING_PAYMENT",
            paidAt: null,
            paymentExpiredAt: null,
            paymentExpiresAt: { gt: now },
          },
          data: {
            status: "PROCESSING",
            customerClaimedAt: now,
            customerClaimedRef: claimedRef,
          },
        });
        if (updated.count !== 1) {
          throw new Error("ORDER_UPDATE_CONFLICT");
        }

        await tx.adminAuditLog.create({
          data: {
            actorId: ownerId,
            action: "CUSTOMER_PAYMENT_CLAIMED",
            entityType: "Customer_order",
            entityId: order.id,
            metadata: {
              orderNumber: order.orderNumber,
              total: order.total,
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
    );

    return NextResponse.json({ success: true, orderNumber: order.orderNumber });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_UPDATE_CONFLICT") {
      return NextResponse.json({ error: "ORDER_NOT_AWAITING_PAYMENT" }, { status: 409 });
    }
    throw error;
  }
}
