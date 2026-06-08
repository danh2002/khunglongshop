type SessionUser = {
  id: string;
  email?: string | null;
};

export type AccountOrderStatus = "placed" | "packed" | "shipping" | "delivered" | "canceled" | "unknown";

export const ACCOUNT_ORDER_STATUS_LABELS: Record<AccountOrderStatus, string> = {
  placed: "Đã đặt",
  packed: "Đã đóng gói",
  shipping: "Đang giao",
  delivered: "Đã giao",
  canceled: "Đã hủy",
  unknown: "Không xác định",
};

export function normalizeAccountOrderStatus(status: string | null | undefined): AccountOrderStatus {
  const value = String(status || "").toLowerCase();

  if (["pending", "confirmed", "processing", "paid"].includes(value)) return "placed";
  if (["packed", "packaged"].includes(value)) return "packed";
  if (["shipping", "shipped", "in_transit"].includes(value)) return "shipping";
  if (["delivered", "completed"].includes(value)) return "delivered";
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
    case "placed":
      return ["pending", "confirmed", "processing", "paid"];
    case "packed":
      return ["packed", "packaged"];
    case "shipping":
      return ["shipping", "shipped", "in_transit"];
    case "delivered":
      return ["delivered", "completed"];
    case "canceled":
      return ["canceled", "cancelled"];
    default:
      return null;
  }
}

export function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
