import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminApi: vi.fn(),
  transaction: vi.fn(),
  redemptionCodeFindUnique: vi.fn(),
  redemptionCodeUpdateMany: vi.fn(),
  blindBoxAllocationDelete: vi.fn(),
}));

vi.mock("@/utils/adminAuth", () => ({
  requireAdminApi: mocks.requireAdminApi,
}));

vi.mock("@/utils/db", () => {
  const tx = {
    redemptionCode: {
      findUnique: mocks.redemptionCodeFindUnique,
      updateMany: mocks.redemptionCodeUpdateMany,
    },
    blindBoxAllocation: {
      delete: mocks.blindBoxAllocationDelete,
    },
  };

  return {
    default: {
      $transaction: mocks.transaction,
      redemptionCode: tx.redemptionCode,
      blindBoxAllocation: tx.blindBoxAllocation,
    },
  };
});

import { POST } from "@/app/api/admin/redemption-codes/[id]/disable/route";

const routeContext = (id: string) => ({ params: Promise.resolve({ id }) });

describe("admin redemption code revocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminApi.mockResolvedValue({
      session: { user: { id: "admin-1" } },
      admin: { id: "admin-1", role: "admin", isActive: true },
      response: null,
    });
    mocks.transaction.mockImplementation(
      async (operation: (client: unknown) => Promise<unknown>) =>
        operation({
          redemptionCode: {
            findUnique: mocks.redemptionCodeFindUnique,
            updateMany: mocks.redemptionCodeUpdateMany,
          },
          blindBoxAllocation: {
            delete: mocks.blindBoxAllocationDelete,
          },
        })
    );
    mocks.redemptionCodeUpdateMany.mockResolvedValue({ count: 1 });
    mocks.blindBoxAllocationDelete.mockResolvedValue({});
  });

  it("keeps ACTIVE unused disable behavior without touching allocations", async () => {
    mocks.redemptionCodeFindUnique.mockResolvedValue({
      id: "code-1",
      status: "ACTIVE",
      usedAt: null,
      allocationId: null,
    });

    const response = await POST(new Request("http://localhost"), routeContext("code-1"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(mocks.redemptionCodeUpdateMany).toHaveBeenCalledWith({
      where: { id: "code-1", status: "ACTIVE", usedAt: null },
      data: { status: "DISABLED", isUsed: false },
    });
    expect(mocks.blindBoxAllocationDelete).not.toHaveBeenCalled();
  });

  it("revokes a REDEEMED code and deletes its tied blind-box allocation", async () => {
    const usedAt = new Date("2026-08-14T00:00:00.000Z");
    mocks.redemptionCodeFindUnique.mockResolvedValue({
      id: "code-1",
      status: "REDEEMED",
      usedAt,
      allocationId: "allocation-1",
    });

    const response = await POST(new Request("http://localhost"), routeContext("code-1"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(mocks.redemptionCodeUpdateMany).toHaveBeenCalledWith({
      where: { id: "code-1", status: "REDEEMED" },
      data: {
        status: "DISABLED",
        isUsed: false,
        usedAt: null,
        allocationId: null,
      },
    });
    expect(mocks.blindBoxAllocationDelete).toHaveBeenCalledWith({
      where: { id: "allocation-1" },
    });
  });

  it("revokes a REDEEMED code without allocation without deleting unrelated allocations", async () => {
    mocks.redemptionCodeFindUnique.mockResolvedValue({
      id: "code-1",
      status: "REDEEMED",
      usedAt: new Date("2026-08-14T00:00:00.000Z"),
      allocationId: null,
    });

    const response = await POST(new Request("http://localhost"), routeContext("code-1"));

    expect(response.status).toBe(200);
    expect(mocks.redemptionCodeUpdateMany).toHaveBeenCalledWith({
      where: { id: "code-1", status: "REDEEMED" },
      data: {
        status: "DISABLED",
        isUsed: false,
        usedAt: null,
        allocationId: null,
      },
    });
    expect(mocks.blindBoxAllocationDelete).not.toHaveBeenCalled();
  });

  it.each(["DISABLED", "CANCELLED"])(
    "rejects %s codes without updating or deleting",
    async (status) => {
      mocks.redemptionCodeFindUnique.mockResolvedValue({
        id: "code-1",
        status,
        usedAt: null,
        allocationId: null,
      });

      const response = await POST(new Request("http://localhost"), routeContext("code-1"));
      const payload = await response.json();

      expect(response.status).toBe(409);
      expect(payload.error.code).toBe("CODE_NOT_ACTIVE");
      expect(mocks.redemptionCodeUpdateMany).not.toHaveBeenCalled();
      expect(mocks.blindBoxAllocationDelete).not.toHaveBeenCalled();
    }
  );

  it("returns a conflict when the compare-and-set update loses the race", async () => {
    mocks.redemptionCodeFindUnique.mockResolvedValue({
      id: "code-1",
      status: "REDEEMED",
      usedAt: new Date("2026-08-14T00:00:00.000Z"),
      allocationId: "allocation-1",
    });
    mocks.redemptionCodeUpdateMany.mockResolvedValue({ count: 0 });

    const response = await POST(new Request("http://localhost"), routeContext("code-1"));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("CODE_NOT_ACTIVE");
    expect(payload.success).toBeUndefined();
    expect(mocks.blindBoxAllocationDelete).not.toHaveBeenCalled();
  });
});
