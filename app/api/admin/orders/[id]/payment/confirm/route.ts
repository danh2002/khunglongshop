import { NextResponse } from "next/server";
import { adminError } from "@/lib/adminResponses";
import {
  confirmOrderPayment,
  PaymentConfirmationError,
} from "@/lib/paymentConfirmation";
import { requireAdminApi } from "@/utils/adminAuth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, response } = await requireAdminApi();
  if (response || !admin) return response;

  const { id } = await params;
  try {
    const order = await confirmOrderPayment({
      orderId: id,
      adminActorId: admin.id,
    });
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof PaymentConfirmationError) {
      if (error.code === "ORDER_NOT_FOUND") {
        return adminError(404, error.code, "Không tìm thấy đơn hàng.");
      }
      return adminError(
        409,
        error.code,
        "Đơn hàng không còn đủ điều kiện xác nhận thanh toán."
      );
    }
    throw error;
  }
}
