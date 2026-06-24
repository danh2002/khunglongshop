import type { OrderStatus } from "@prisma/client";

type SessionUser = {
  id: string;
  email?: string | null;
};

export type AccountOrderStatus =
  | "pending_payment"
  | "processing"
  | "completed"
  | "canceled"
  | "unknown";

export const ACCOUNT_ORDER_STATUS_LABELS: Record<AccountOrderStatus, string> = {
  pending_payment: "Chờ thanh toán",
  processing: "Đang xử lý",
  completed: "Hoàn thành",
  canceled: "Đã hủy",
  unknown: "Không xác định",
};

export function normalizeAccountOrderStatus(status: string | null | undefined): AccountOrderStatus {
  const value = String(status || "").toLowerCase();

  if (["pending_payment", "pending", "confirmed"].includes(value)) return "pending_payment";
  if (["processing", "paid", "packed", "packaged"].includes(value)) return "processing";
  if (value === "completed") return "completed";
  if (["canceled", "cancelled"].includes(value)) return "canceled";

  return "unknown";
}

export function getAccountOrderOwnershipWhere(user: SessionUser) {
  const legacyEmail = user.email?.trim().toLowerCase();

  return {
    OR: [
      { userId: user.id },
      ...(legacyEmail
        ? [
            {
              userId: null,
              email: legacyEmail,
            },
          ]
        : []),
    ],
  };
}

export function getStatusRawValues(status: string | null) {
  switch (status) {
    case "pending_payment":
      return ["PENDING_PAYMENT"] satisfies OrderStatus[];
    case "processing":
      return ["PROCESSING"] satisfies OrderStatus[];
    case "completed":
      return ["COMPLETED"] satisfies OrderStatus[];
    case "canceled":
      return ["CANCELLED"] satisfies OrderStatus[];
    default:
      return null;
  }
}

export function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
