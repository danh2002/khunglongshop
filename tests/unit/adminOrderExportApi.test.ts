import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAdminApi: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/utils/adminAuth", () => ({
  requireAdminApi: mocks.requireAdminApi,
}));

vi.mock("@/utils/db", () => ({
  default: { customer_order: { findMany: mocks.findMany } },
}));

import { GET } from "@/app/api/admin/orders/export/route";

describe("admin order export API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminApi.mockResolvedValue({
      session: { user: { id: "admin-1" } },
      admin: { id: "admin-1", role: "admin", isActive: true },
      response: null,
    });
    mocks.findMany.mockResolvedValue([]);
  });

  it("returns the admin auth response without querying orders", async () => {
    mocks.requireAdminApi.mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await GET(new NextRequest("http://localhost/api/admin/orders/export"));

    expect(response.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ["status=UNKNOWN"],
    ["dateFrom=2026-02-30"],
    ["dateTo=25-08-2026"],
    [`search=${"a".repeat(101)}`],
  ])("rejects invalid query input: %s", async (query) => {
    const response = await GET(
      new NextRequest(`http://localhost/api/admin/orders/export?${query}`)
    );

    expect(response.status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("exports every matching order with the exact safe selection", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/orders/export"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { dateTime: "desc" },
      select: {
        orderNumber: true,
        name: true,
        lastname: true,
        email: true,
        phone: true,
        status: true,
        total: true,
        dateTime: true,
      },
    });
    const query = mocks.findMany.mock.calls[0]?.[0];
    expect(query).not.toHaveProperty("skip");
    expect(query).not.toHaveProperty("take");
  });

  it("applies search, status, and inclusive date filters together", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/orders/export?search=%20An%20Nguyen%20&status=COMPLETED&dateFrom=2026-08-01&dateTo=2026-08-25"
      )
    );
    const where = mocks.findMany.mock.calls[0]?.[0].where;

    expect(response.status).toBe(200);
    expect(where.status).toBe("COMPLETED");
    expect(where.dateTime).toEqual({
      gte: new Date("2026-08-01"),
      lte: new Date("2026-08-25T23:59:59"),
    });
    expect(where.OR).toBeDefined();
  });
});
