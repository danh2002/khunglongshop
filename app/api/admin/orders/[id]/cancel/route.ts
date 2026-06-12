import { NextResponse } from "next/server";
import { z } from "zod";
import {
  cancelOrder,
  OrderCancellationError,
} from "@/lib/orderCancellation";
import { requireAdminApi } from "@/utils/adminAuth";

const bodySchema = z.object({
  reason: z.string().trim().min(10).max(500),
});

async function cancelAdminOrder(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAdminApi();
  if (response || !session) return response;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_REASON" }, { status: 400 });
  }

  const { id } = await params;
  try {
    const order = await cancelOrder({
      orderId: id,
      adminActorId: session.user.id,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof OrderCancellationError) {
      const status = error.code === "ORDER_NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: error.code }, { status });
    }
    throw error;
  }
}

export const PATCH = cancelAdminOrder;
export const POST = cancelAdminOrder;
