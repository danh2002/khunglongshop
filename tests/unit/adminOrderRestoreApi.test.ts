import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mocks = vi.hoisted(() => {
  class MockOrderRestorationError extends Error {
    constructor(public code: string) {
      super(code);
    }
  }
  return {
    requireAdminApi: vi.fn(),
    restoreCancelledOrder: vi.fn(),
    OrderRestorationError: MockOrderRestorationError,
  };
});

vi.mock("@/utils/adminAuth", () => ({
  requireAdminApi: mocks.requireAdminApi,
}));

vi.mock("@/lib/orderRestoration", () => ({
  restoreCancelledOrder: mocks.restoreCancelledOrder,
  OrderRestorationError: mocks.OrderRestorationError,
}));

import { PATCH } from "@/app/api/admin/orders/[id]/restore/route";

const context = { params: Promise.resolve({ id: "order-1" }) };

describe("admin order restore API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminApi.mockResolvedValue({
      session: { user: { id: "admin-1" } },
      admin: { id: "admin-1" },
      response: null,
    });
  });

  it("returns the existing auth response without restoring", async () => {
    const unauthorized = new Response(null, { status: 401 });
    mocks.requireAdminApi.mockResolvedValue({
      session: null,
      admin: null,
      response: unauthorized,
    });

    const response = await PATCH(new Request("http://localhost"), context);

    expect(response).toBe(unauthorized);
    expect(mocks.restoreCancelledOrder).not.toHaveBeenCalled();
  });

  it("restores the order using the authenticated admin actor", async () => {
    mocks.restoreCancelledOrder.mockResolvedValue({
      id: "order-1",
      status: "PENDING_PAYMENT",
    });

    const response = await PATCH(new Request("http://localhost"), context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.order.status).toBe("PENDING_PAYMENT");
    expect(mocks.restoreCancelledOrder).toHaveBeenCalledWith({
      orderId: "order-1",
      adminActorId: "admin-1",
    });
  });

  it("maps a missing order to 404", async () => {
    mocks.restoreCancelledOrder.mockRejectedValue(
      new mocks.OrderRestorationError("ORDER_NOT_FOUND")
    );

    const response = await PATCH(new Request("http://localhost"), context);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("ORDER_NOT_FOUND");
  });

  it.each([
    "ORDER_NOT_CANCELLED",
    "ORDER_HAS_REDEEMED_CODE",
    "ORDER_HAS_DISABLED_CODE",
    "ORDER_RESTORATION_DATA_INVALID",
    "INSUFFICIENT_STOCK",
    "ORDER_RESTORATION_CONFLICT",
  ])("maps %s to a stable 409 response", async (code) => {
    mocks.restoreCancelledOrder.mockRejectedValue(
      new mocks.OrderRestorationError(code)
    );

    const response = await PATCH(new Request("http://localhost"), context);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe(code);
    expect(payload.error.message).toEqual(expect.any(String));
  });

  it("hides unexpected errors behind a stable 500 response", async () => {
    mocks.restoreCancelledOrder.mockRejectedValue(new Error("database secret"));

    const response = await PATCH(new Request("http://localhost"), context);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error.code).toBe("ORDER_RESTORATION_FAILED");
    expect(JSON.stringify(payload)).not.toContain("database secret");
  });

  it("wires cancelled-order restoration to the dedicated endpoint", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/admin/OrderStatusForm.tsx"),
      "utf8"
    );

    expect(source).toContain("canRestoreCancelledOrder(status)");
    expect(source).toContain("`/api/admin/orders/${orderId}/restore`");
    expect(source).toContain('nextStatus === "PENDING_PAYMENT"');
  });
});
