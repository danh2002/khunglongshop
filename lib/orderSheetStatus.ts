import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_TO_SHEET = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
} satisfies Record<OrderStatus, string>;

export type OrderSheetStatusLabel =
  (typeof ORDER_STATUS_TO_SHEET)[OrderStatus];

const SHEET_TO_ORDER_STATUS = Object.fromEntries(
  Object.entries(ORDER_STATUS_TO_SHEET).map(([status, label]) => [label, status])
) as Record<OrderSheetStatusLabel, OrderStatus>;

export class OrderSheetStatusError extends Error {
  constructor(public readonly code: "SHEET_STATUS_INVALID") {
    super(code);
    this.name = "OrderSheetStatusError";
  }
}

export function toOrderSheetStatus(status: OrderStatus) {
  return ORDER_STATUS_TO_SHEET[status];
}

export function fromOrderSheetStatus(label: string): OrderStatus {
  const status = SHEET_TO_ORDER_STATUS[label as OrderSheetStatusLabel];
  if (!status) throw new OrderSheetStatusError("SHEET_STATUS_INVALID");
  return status;
}
