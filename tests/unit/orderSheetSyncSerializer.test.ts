import { describe, expect, it } from "vitest";
import { serializeOrderSheetRow } from "@/lib/orderSheetSync";
import {
  fromOrderSheetStatus,
  ORDER_STATUS_TO_SHEET,
  OrderSheetStatusError,
} from "@/lib/orderSheetStatus";

describe("order Sheet row serialization", () => {
  it("maps every live order status in both directions", () => {
    expect(ORDER_STATUS_TO_SHEET).toEqual({
      PENDING_PAYMENT: "Chờ thanh toán",
      PROCESSING: "Đang xử lý",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy",
    });
    for (const [status, label] of Object.entries(ORDER_STATUS_TO_SHEET)) {
      expect(fromOrderSheetStatus(label)).toBe(status);
    }
    expect(() => fromOrderSheetStatus("Không hợp lệ")).toThrowError(
      new OrderSheetStatusError("SHEET_STATUS_INVALID")
    );
  });

  it("creates the canonical PII-minimized managed row", () => {
    const row = serializeOrderSheetRow(
      {
        id: "order-uuid",
        orderNumber: 1_000_004,
        name: "Danh",
        lastname: "Phạm",
        phone: "0900000000",
        email: "danh@example.com",
        adress: "12 Trần Phú",
        apartment: "Căn 3",
        city: "Hà Nội",
        country: "Việt Nam",
        postalCode: "100000",
        total: 150_000,
        status: "PENDING_PAYMENT",
        dateTime: new Date("2026-08-07T01:00:00.000Z"),
        products: [
          { id: "b", productTitle: "Khủng long B", quantity: 1 },
          { id: "a", productTitle: "Khủng long A", quantity: 2 },
        ],
      },
      { dbRevision: 3, sheetRevision: 1 }
    );

    expect(row).toEqual({
      orderId: "order-uuid",
      orderNumber: "#1000004",
      customerName: "Danh Phạm",
      phone: "0900000000",
      email: "danh@example.com",
      shippingAddress: "Căn 3, 12 Trần Phú, Hà Nội, Việt Nam, 100000",
      products: "Khủng long B × 1\nKhủng long A × 2",
      total: 150_000,
      status: "Chờ thanh toán",
      createdAt: "2026-08-07T01:00:00.000Z",
      dbRevision: 3,
      sheetRevision: 1,
      syncError: "",
    });
  });
});
