import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  cancelOrder: vi.fn(),
}));

vi.mock("@/utils/db", () => ({
  default: { customer_order: { findMany: mocks.findMany } },
}));

vi.mock("@/lib/orderCancellation", () => ({
  OrderCancellationError: class OrderCancellationError extends Error {
    constructor(public code: string) {
      super(code);
    }
  },
  cancelOrder: mocks.cancelOrder,
}));

import {
  expireDuePaymentOrders,
  expirePaymentOrder,
} from "@/lib/paymentExpiry";

describe("payment expiry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes authoritative expiry time into safe cancellation", async () => {
    const now = new Date("2026-08-06T12:05:00.000Z");
    mocks.cancelOrder.mockResolvedValue({ id: "order-1", status: "CANCELLED" });

    await expirePaymentOrder("order-1", now);
    expect(mocks.cancelOrder).toHaveBeenCalledWith({
      orderId: "order-1",
      paymentExpiryAt: now,
      reason: "PAYMENT_EXPIRED",
    });
  });

  it("processes a bounded batch and reports failures without exposing orders", async () => {
    const now = new Date("2026-08-06T12:05:00.000Z");
    mocks.findMany.mockResolvedValue([{ id: "one" }, { id: "two" }]);
    mocks.cancelOrder
      .mockResolvedValueOnce({ id: "one", status: "CANCELLED" })
      .mockRejectedValueOnce(new Error("database unavailable"));

    await expect(expireDuePaymentOrders(now, 500)).resolves.toEqual({
      selected: 2,
      expired: 1,
      skipped: 0,
      failed: 1,
    });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100, select: { id: true } })
    );
  });
});
