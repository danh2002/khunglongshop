import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { PaymentError, toPaymentDto } from "@/lib/payment";
import { renewOrderPayment } from "@/lib/paymentRenewal";
import { OrderRestorationError } from "@/lib/orderRestoration";
import { authOptions } from "@/utils/authOptions";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const ownerId = session?.user?.id;
  if (!ownerId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const order = await renewOrderPayment({ orderId: id, ownerId });
    return NextResponse.json({ payment: toPaymentDto(order) });
  } catch (error) {
    if (
      error instanceof OrderRestorationError &&
      error.code === "ORDER_NOT_FOUND"
    ) {
      return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
    }
    if (error instanceof OrderRestorationError || error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
