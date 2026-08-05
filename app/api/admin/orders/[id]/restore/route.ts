import { NextResponse } from "next/server";
import { adminError } from "@/lib/adminResponses";
import {
  OrderRestorationError,
  restoreCancelledOrder,
  type OrderRestorationErrorCode,
} from "@/lib/orderRestoration";
import { requireAdminApi } from "@/utils/adminAuth";

const conflictMessages: Partial<Record<OrderRestorationErrorCode, string>> = {
  ORDER_NOT_CANCELLED: "Chỉ có thể khôi phục đơn hàng đã huỷ.",
  ORDER_HAS_REDEEMED_CODE:
    "Không thể khôi phục vì đơn hàng có mã mở khoá đã được sử dụng.",
  ORDER_HAS_DISABLED_CODE:
    "Không thể khôi phục vì đơn hàng có mã mở khoá đã bị vô hiệu hoá.",
  ORDER_RESTORATION_DATA_INVALID:
    "Dữ liệu túi mù của đơn hàng không còn nguyên vẹn để khôi phục an toàn.",
  INSUFFICIENT_STOCK: "Không đủ tồn kho để khôi phục đơn hàng này.",
  ORDER_RESTORATION_CONFLICT:
    "Đơn hàng vừa được thay đổi. Vui lòng tải lại trang và thử lại.",
};

async function restoreAdminOrder(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAdminApi();
  if (response || !session) return response;

  const { id } = await params;
  try {
    const order = await restoreCancelledOrder({
      orderId: id,
      adminActorId: session.user.id,
    });
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof OrderRestorationError) {
      if (error.code === "ORDER_NOT_FOUND") {
        return adminError(404, error.code, "Không tìm thấy đơn hàng.");
      }
      return adminError(
        409,
        error.code,
        conflictMessages[error.code] ?? "Không thể khôi phục đơn hàng."
      );
    }
    return adminError(
      500,
      "ORDER_RESTORATION_FAILED",
      "Không thể khôi phục đơn hàng lúc này."
    );
  }
}

export const PATCH = restoreAdminOrder;
export const POST = restoreAdminOrder;
