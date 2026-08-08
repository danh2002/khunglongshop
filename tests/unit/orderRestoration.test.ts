import { Prisma } from "@prisma/client";
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

import { restoreCancelledOrder } from "@/lib/orderRestoration";

const restoredOrder = { id: "order-1", status: "PENDING_PAYMENT" };

function normalOrder() {
  return {
    id: "order-1",
    status: "CANCELLED",
    products: [
      {
        id: "item-1",
        productId: "product-1",
        quantity: 2,
        product: { isBlindBox: false },
        blindBoxAllocations: [],
      },
    ],
    blindBoxAllocations: [],
    redemptionCodes: [],
  };
}

function blindBoxOrder() {
  const voidedAt = new Date("2026-08-01T00:00:00.000Z");
  return {
    id: "order-1",
    status: "CANCELLED",
    products: [
      {
        id: "item-1",
        productId: "blind-box-1",
        quantity: 1,
        product: { isBlindBox: true },
        blindBoxAllocations: [
          {
            id: "allocation-1",
            orderItemId: "item-1",
            status: "VOIDED",
            voidedAt,
            redemptionCode: {
              id: "code-1",
              allocationId: "allocation-1",
              orderId: "order-1",
              status: "CANCELLED",
            },
          },
        ],
      },
    ],
    blindBoxAllocations: [
      { id: "allocation-1", orderItemId: "item-1" },
    ],
    redemptionCodes: [
      {
        id: "code-1",
        allocationId: "allocation-1",
        orderId: "order-1",
        status: "CANCELLED",
      },
    ],
  };
}

const transactionClient = {
  customer_order: {
    findUnique: mocks.orderFindUnique,
    updateMany: mocks.orderUpdateMany,
  },
  product: { updateMany: mocks.productUpdateMany },
  blindBoxAllocation: { updateMany: mocks.allocationUpdateMany },
  redemptionCode: { updateMany: mocks.codeUpdateMany },
  adminAuditLog: { create: mocks.auditCreate },
  orderSheetSyncState: { upsert: mocks.syncUpsert },
};

async function expectRestorationError(code: string) {
  await expect(
    restoreCancelledOrder({ orderId: "order-1", adminActorId: "admin-1" })
  ).rejects.toMatchObject({ code });
}

describe("restoreCancelledOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      async (operation: (tx: typeof transactionClient) => Promise<unknown>) =>
        operation(transactionClient)
    );
    mocks.orderFindUnique
      .mockResolvedValueOnce(normalOrder())
      .mockResolvedValueOnce(restoredOrder);
    mocks.productUpdateMany.mockResolvedValue({ count: 1 });
    mocks.allocationUpdateMany.mockResolvedValue({ count: 1 });
    mocks.codeUpdateMany.mockResolvedValue({ count: 1 });
    mocks.orderUpdateMany.mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.syncUpsert.mockResolvedValue({ orderId: "order-1" });
  });

  it("reserves stock and restores a normal order to pending payment", async () => {
    const result = await restoreCancelledOrder({
      orderId: "order-1",
      adminActorId: "admin-1",
    });

    expect(result).toEqual(restoredOrder);
    expect(mocks.productUpdateMany).toHaveBeenCalledWith({
      where: { id: "product-1", inStock: { gte: 2 } },
      data: { inStock: { decrement: 2 } },
    });
    expect(mocks.orderUpdateMany).toHaveBeenCalledWith({
      where: { id: "order-1", status: "CANCELLED" },
      data: { status: "PENDING_PAYMENT" },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "admin-1",
        action: "ORDER_RESTORED",
        entityId: "order-1",
      }),
    });
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 15000,
    });
  });

  it("reactivates the original blind-box allocation and code", async () => {
    mocks.orderFindUnique.mockReset();
    mocks.orderFindUnique
      .mockResolvedValueOnce(blindBoxOrder())
      .mockResolvedValueOnce(restoredOrder);

    await restoreCancelledOrder({
      orderId: "order-1",
      adminActorId: "admin-1",
    });

    expect(mocks.allocationUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["allocation-1"] }, status: "VOIDED" },
      data: { status: "ACTIVE", voidedAt: null },
    });
    expect(mocks.codeUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["code-1"] }, status: "CANCELLED" },
      data: { status: "ACTIVE", isUsed: false, usedAt: null },
    });
  });

  it("restores a checkout allocation that never had a redemption code", async () => {
    const order = blindBoxOrder();
    order.products[0]!.blindBoxAllocations[0]!.redemptionCode = null as never;
    order.redemptionCodes = [];
    mocks.orderFindUnique.mockReset();
    mocks.orderFindUnique
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce(restoredOrder);

    await restoreCancelledOrder({
      orderId: "order-1",
      adminActorId: "admin-1",
    });

    expect(mocks.allocationUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.codeUpdateMany).not.toHaveBeenCalled();
    expect(mocks.orderUpdateMany).toHaveBeenCalledWith({
      where: { id: "order-1", status: "CANCELLED" },
      data: { status: "PENDING_PAYMENT" },
    });
  });

  it("rejects insufficient stock before changing status or writing an audit", async () => {
    mocks.productUpdateMany.mockResolvedValue({ count: 0 });

    await expectRestorationError("INSUFFICIENT_STOCK");

    expect(mocks.orderUpdateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["REDEEMED", "ORDER_HAS_REDEEMED_CODE"],
    ["DISABLED", "ORDER_HAS_DISABLED_CODE"],
  ])("rejects an order-level %s code before inventory writes", async (status, code) => {
    const order = blindBoxOrder();
    order.redemptionCodes[0]!.status = status;
    mocks.orderFindUnique.mockReset();
    mocks.orderFindUnique.mockResolvedValue(order);

    await expectRestorationError(code);

    expect(mocks.productUpdateMany).not.toHaveBeenCalled();
  });

  it.each([
    "missing allocation",
    "wrong code status",
    "wrong order link",
    "extra order-level code",
    "allocation on normal product",
  ])("rejects invalid blind-box data: %s", async (variant) => {
    const order = blindBoxOrder();
    if (variant === "missing allocation") {
      order.products[0]!.blindBoxAllocations = [];
    } else if (variant === "wrong code status") {
      order.products[0]!.blindBoxAllocations[0]!.redemptionCode.status = "ACTIVE";
    } else if (variant === "wrong order link") {
      order.products[0]!.blindBoxAllocations[0]!.redemptionCode.orderId = "other";
    } else if (variant === "extra order-level code") {
      order.redemptionCodes.push({
        id: "code-2",
        allocationId: "allocation-2",
        orderId: "order-1",
        status: "CANCELLED",
      });
    } else {
      order.products[0]!.product.isBlindBox = false;
    }
    mocks.orderFindUnique.mockReset();
    mocks.orderFindUnique.mockResolvedValue(order);

    await expectRestorationError("ORDER_RESTORATION_DATA_INVALID");

    expect(mocks.productUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects a non-cancelled order before inventory writes", async () => {
    const order = normalOrder();
    order.status = "PENDING_PAYMENT";
    mocks.orderFindUnique.mockReset();
    mocks.orderFindUnique.mockResolvedValue(order);

    await expectRestorationError("ORDER_NOT_CANCELLED");

    expect(mocks.productUpdateMany).not.toHaveBeenCalled();
  });

  it("reports a concurrent status update and skips the success audit", async () => {
    mocks.orderUpdateMany.mockResolvedValue({ count: 0 });

    await expectRestorationError("ORDER_RESTORATION_CONFLICT");

    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("translates a Prisma transaction conflict", async () => {
    mocks.transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("conflict", {
        code: "P2034",
        clientVersion: "6.16.1",
      })
    );

    await expectRestorationError("ORDER_RESTORATION_CONFLICT");
  });
});
