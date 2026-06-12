import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminError, validationError } from "@/lib/adminResponses";
import { canTransitionOrderStatus } from "@/lib/orderTransitions";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

const bodySchema = z.object({ status: z.nativeEnum(OrderStatus) });
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAdminApi();
  if (response || !session) return response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const order = await prisma.customer_order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      products: {
        select: {
          product: { select: { isBlindBox: true } },
          blindBoxAllocations: { select: { id: true } },
        },
      },
    },
  });
  if (!order) return adminError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");

  if (!canTransitionOrderStatus(order.status, parsed.data.status)) {
    return adminError(
      409,
      "INVALID_ORDER_STATUS_TRANSITION",
      `Không thể chuyển từ ${order.status} sang ${parsed.data.status}.`
    );
  }

  if (parsed.data.status === "CANCELLED") {
    return adminError(
      400,
      "CANCELLATION_REASON_REQUIRED",
      "Vui lòng dùng endpoint hủy đơn và cung cấp lý do."
    );
  }

  const hasUnallocatedBlindBox = order.products.some(
    (item) => item.product.isBlindBox && item.blindBoxAllocations.length === 0
  );
  if (parsed.data.status === "PROCESSING" && hasUnallocatedBlindBox) {
    return adminError(
      409,
      "BLIND_BOX_ALLOCATION_REQUIRED",
      "Đơn túi mù phải được tạo qua checkout nguyên tử để sinh kết quả trước khi xử lý."
    );
  }

  const updated = await prisma.customer_order.update({
    where: { id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json(updated);
}
