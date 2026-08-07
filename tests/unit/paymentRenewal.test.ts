import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  orderFindUnique: vi.fn(),
  orderUpdateMany: vi.fn(),
  productUpdateMany: vi.fn(),
  allocationUpdateMany: vi.fn(),
  codeUpdateMany: vi.fn(),
  auditCreate: vi.fn(),
  syncUpsert: vi.fn(),
}));

vi.mock("@/utils/db", () => ({
  default: { $transaction: mocks.transaction },
}));

import { renewOrderPayment } from "@/lib/paymentRenewal";

const expiredAt = new Date("2026-08-06T12:00:00.000Z");
const now = new Date("2026-08-06T12:05:00.000Z");

function expiredOrder() {
  return {
    id: "order-1",
    userId: "user-1",
    status: "CANCELLED",
    paidAt: null,
    paymentRef: "KLS-OLD",
    paymentExpiredAt: expiredAt,
    products: [
      {
        id: "item-1",
        productId: "product-1",
        quantity: 1,
        product: { isBlindBox: false },
        blindBoxAllocations: [],
      },
    ],
    blindBoxAllocations: [],
    redemptionCodes: [],
  };
}

describe("payment renewal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        customer_order: {
          findUnique: mocks.orderFindUnique,
          updateMany: mocks.orderUpdateMany,
        },
        product: { updateMany: mocks.productUpdateMany },
        blindBoxAllocation: { updateMany: mocks.allocationUpdateMany },
        redemptionCode: { updateMany: mocks.codeUpdateMany },
        adminAuditLog: { create: mocks.auditCreate },
        orderSheetSyncState: { upsert: mocks.syncUpsert },
      })
    );
    mocks.syncUpsert.mockResolvedValue({ orderId: "order-1" });
  });

  it("reserves inventory, reactivates once, and audits the new reference", async () => {
    const renewed = { ...expiredOrder(), status: "PENDING_PAYMENT" };
    mocks.orderFindUnique
      .mockResolvedValueOnce(expiredOrder())
      .mockResolvedValueOnce(renewed);
    mocks.productUpdateMany.mockResolvedValue({ count: 1 });
    mocks.orderUpdateMany.mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });

    await expect(
      renewOrderPayment({ orderId: "order-1", ownerId: "user-1", now })
    ).resolves.toEqual(renewed);
    expect(mocks.orderUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "CANCELLED",
          paymentExpiredAt: { not: null },
        }),
        data: expect.objectContaining({
          status: "PENDING_PAYMENT",
          paymentExpiredAt: null,
        }),
      })
    );
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "user-1",
        action: "QR_RENEWED",
        metadata: expect.objectContaining({ oldRef: "KLS-OLD" }),
      }),
    });
  });

  it("does not write an audit when inventory reservation rolls back", async () => {
    mocks.orderFindUnique.mockResolvedValue(expiredOrder());
    mocks.productUpdateMany.mockResolvedValue({ count: 0 });

    await expect(
      renewOrderPayment({ orderId: "order-1", ownerId: "user-1", now })
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    expect(mocks.orderUpdateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
