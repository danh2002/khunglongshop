import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAdminApi: vi.fn(),
  hash: vi.fn(),
  transaction: vi.fn(),
  userFindMany: vi.fn(),
  userCount: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
  userDelete: vi.fn(),
  orderCount: vi.fn(),
  wishlistCount: vi.fn(),
  notificationCount: vi.fn(),
  bulkUploadBatchCount: vi.fn(),
  redemptionCodeCount: vi.fn(),
  setRewardCount: vi.fn(),
  adminAuditLogCount: vi.fn(),
  blindBoxAllocationCount: vi.fn(),
}));

vi.mock("@/utils/adminAuth", () => ({
  requireAdminApi: mocks.requireAdminApi,
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mocks.hash },
}));

vi.mock("@/utils/db", () => {
  const client = {
    user: {
      findMany: mocks.userFindMany,
      count: mocks.userCount,
      findUnique: mocks.userFindUnique,
      create: mocks.userCreate,
      update: mocks.userUpdate,
      delete: mocks.userDelete,
    },
    customer_order: { count: mocks.orderCount },
    wishlist: { count: mocks.wishlistCount },
    notification: { count: mocks.notificationCount },
    bulk_upload_batch: { count: mocks.bulkUploadBatchCount },
    redemptionCode: { count: mocks.redemptionCodeCount },
    setReward: { count: mocks.setRewardCount },
    adminAuditLog: { count: mocks.adminAuditLogCount },
    blindBoxAllocation: { count: mocks.blindBoxAllocationCount },
    $transaction: mocks.transaction,
  };
  return { default: client };
});

import {
  GET as listUsers,
  POST as createUser,
} from "@/app/api/admin/users/route";
import {
  DELETE as deleteUser,
  PATCH as updateUser,
} from "@/app/api/admin/users/[id]/route";
import { runSerializableAdminUserMutation } from "@/lib/adminUserMutations";

const routeContext = (id: string) => ({ params: Promise.resolve({ id }) });

describe("admin user API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminApi.mockResolvedValue({
      session: { user: { id: "admin-1" } },
      admin: { id: "admin-1", role: "admin", isActive: true },
      response: null,
    });
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.transaction.mockImplementation(
      async (operation: (client: unknown) => Promise<unknown>) =>
        operation({
          user: {
            findUnique: mocks.userFindUnique,
            count: mocks.userCount,
            update: mocks.userUpdate,
            delete: mocks.userDelete,
          },
          customer_order: { count: mocks.orderCount },
          wishlist: { count: mocks.wishlistCount },
          notification: { count: mocks.notificationCount },
          bulk_upload_batch: { count: mocks.bulkUploadBatchCount },
          redemptionCode: { count: mocks.redemptionCodeCount },
          setReward: { count: mocks.setRewardCount },
          adminAuditLog: { count: mocks.adminAuditLogCount },
          blindBoxAllocation: { count: mocks.blindBoxAllocationCount },
        })
    );
    [
      mocks.orderCount,
      mocks.wishlistCount,
      mocks.notificationCount,
      mocks.bulkUploadBatchCount,
      mocks.redemptionCodeCount,
      mocks.setRewardCount,
      mocks.adminAuditLogCount,
      mocks.blindBoxAllocationCount,
    ].forEach((mock) => mock.mockResolvedValue(0));
  });

  it("rejects an invalid list status instead of ignoring it", async () => {
    const response = await listUsers(
      new NextRequest("http://localhost/api/admin/users?status=archived")
    );

    expect(response.status).toBe(400);
    expect(mocks.userFindMany).not.toHaveBeenCalled();
  });

  it("applies the active status filter and safe list selection", async () => {
    mocks.userFindMany.mockResolvedValue([]);
    mocks.userCount.mockResolvedValue(0);

    const response = await listUsers(
      new NextRequest("http://localhost/api/admin/users?status=active")
    );

    expect(response.status).toBe(200);
    expect(mocks.userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        select: expect.not.objectContaining({ password: true }),
      })
    );
  });

  it("translates a concurrent email P2002 into EMAIL_ALREADY_EXISTS", async () => {
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userCreate.mockRejectedValue({ code: "P2002" });

    const response = await createUser(
      new NextRequest("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: "new@example.com",
          password: "StrongPass1!",
        }),
        headers: { "content-type": "application/json" },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("forbids self-demotion inside a TiDB-compatible repeatable-read transaction", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      role: "admin",
      isActive: true,
    });

    const response = await updateUser(
      new NextRequest("http://localhost/api/admin/users/admin-1", {
        method: "PATCH",
        body: JSON.stringify({ role: "user" }),
        headers: { "content-type": "application/json" },
      }),
      routeContext("admin-1")
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("SELF_ACCESS_CHANGE_FORBIDDEN");
    expect(mocks.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      })
    );
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("retries a serialization failure without lowering isolation", async () => {
    const serializationError = new Prisma.PrismaClientKnownRequestError(
      "Transaction conflict",
      { code: "P2034", clientVersion: "6.16.1" }
    );
    mocks.transaction
      .mockRejectedValueOnce(serializationError)
      .mockResolvedValueOnce("completed");

    await expect(
      runSerializableAdminUserMutation(async () => "completed")
    ).resolves.toBe("completed");

    expect(mocks.transaction).toHaveBeenCalledTimes(2);
    expect(mocks.transaction).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      expect.objectContaining({
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      })
    );
  });

  it("returns BlindBoxAllocation counts in a structured dependency conflict", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      role: "user",
      isActive: true,
    });
    mocks.blindBoxAllocationCount.mockResolvedValue(1);

    const response = await deleteUser(
      new NextRequest("http://localhost/api/admin/users/user-1", {
        method: "DELETE",
      }),
      routeContext("user-1")
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("USER_HAS_DEPENDENCIES");
    expect(payload.error.details.dependencyCounts.blindBoxAllocationCount).toBe(
      1
    );
    expect(mocks.userDelete).not.toHaveBeenCalled();
  });
});
