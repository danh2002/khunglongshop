import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  auditCreate: vi.fn(),
  syncUpsert: vi.fn(),
}));

vi.mock("@/utils/db", () => ({
  default: { $transaction: mocks.transaction },
}));

import {
  confirmOrderPayment,
  PaymentConfirmationError,
} from "@/lib/paymentConfirmation";

const now = new Date("2026-08-06T12:00:00.000Z");
const pendingOrder = {
  id: "order-1",
  status: "PENDING_PAYMENT",
  paidAt: null,
  paymentRef: "KLS-ORDER1",
  paymentExpiredAt: null,
  paymentExpiresAt: new Date("2026-08-06T12:05:00.000Z"),
};

describe("payment confirmation concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        customer_order: {
          findUnique: mocks.findUnique,
          updateMany: mocks.updateMany,
        },
        adminAuditLog: { create: mocks.auditCreate },
        orderSheetSyncState: { upsert: mocks.syncUpsert },
      })
    );
    mocks.syncUpsert.mockResolvedValue({ orderId: "order-1" });
  });

  it("confirms once and writes one audit record", async () => {
    const confirmed = { ...pendingOrder, status: "PROCESSING", paidAt: now };
    mocks.findUnique
      .mockResolvedValueOnce(pendingOrder)
      .mockResolvedValueOnce(confirmed);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });

    await expect(
      confirmOrderPayment({ orderId: "order-1", adminActorId: "admin-1", now })
    ).resolves.toEqual(confirmed);
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PENDING_PAYMENT",
          paidAt: null,
        }),
        data: { status: "PROCESSING", paidAt: now },
      })
    );
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
  });

  it("confirms an expired pending payment order by ignoring expiry and setting paidAt", async () => {
    const expiredOrder = {
      ...pendingOrder,
      paymentExpiresAt: new Date("2026-08-06T12:00:00.000Z"),
      paymentExpiredAt: null,
    };
    const confirmed = { ...expiredOrder, status: "PROCESSING", paidAt: now };
    mocks.findUnique
      .mockResolvedValueOnce(expiredOrder)
      .mockResolvedValueOnce(confirmed);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockResolvedValue({ id: "audit-expired" });

    await expect(
      confirmOrderPayment({ orderId: "order-1", adminActorId: "admin-1", now })
    ).resolves.toEqual(confirmed);
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PENDING_PAYMENT",
          paidAt: null,
        }),
        data: { status: "PROCESSING", paidAt: now },
      })
    );
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
  });

  it("confirms a processing order with missing paidAt by setting paidAt", async () => {
    const processingOrder = { ...pendingOrder, status: "PROCESSING", paidAt: null };
    const confirmed = { ...processingOrder, paidAt: now };
    mocks.findUnique
      .mockResolvedValueOnce(processingOrder)
      .mockResolvedValueOnce(confirmed);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockResolvedValue({ id: "audit-2" });

    await expect(
      confirmOrderPayment({ orderId: "order-1", adminActorId: "admin-1", now })
    ).resolves.toEqual(confirmed);
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PROCESSING",
          paidAt: null,
        }),
        data: { status: "PROCESSING", paidAt: now },
      })
    );
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
  });

  it("returns an already-confirmed order without another write or audit", async () => {
    const confirmed = { ...pendingOrder, status: "PROCESSING", paidAt: now };
    mocks.findUnique.mockResolvedValue(confirmed);

    await expect(
      confirmOrderPayment({ orderId: "order-1", adminActorId: "admin-1", now })
    ).resolves.toEqual(confirmed);
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("rolls back through a typed conflict when compare-and-set loses", async () => {
    mocks.findUnique.mockResolvedValue(pendingOrder);
    mocks.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      confirmOrderPayment({ orderId: "order-1", adminActorId: "admin-1", now })
    ).rejects.toEqual(
      new PaymentConfirmationError("PAYMENT_CONFIRMATION_CONFLICT")
    );
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
