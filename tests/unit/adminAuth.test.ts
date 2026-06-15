import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findFirst: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next-auth/next", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/utils/db", () => ({
  default: {
    user: {
      findFirst: mocks.findFirst,
    },
  },
}));

vi.mock("@/utils/authOptions", () => ({
  authOptions: {},
}));

import { requireAdmin, requireAdminApi } from "@/utils/adminAuth";

describe("admin authorization revalidation", () => {
  beforeEach(() => {
    mocks.getServerSession.mockReset();
    mocks.findFirst.mockReset();
    mocks.redirect.mockClear();
  });

  it("returns 401 for a guest API request", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const result = await requireAdminApi();

    expect(result.response?.status).toBe(401);
  });

  it("queries the database instead of trusting the JWT role", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "admin-1", role: "admin" },
    });
    mocks.findFirst.mockResolvedValue(null);

    const result = await requireAdminApi();

    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "admin-1",
          role: "admin",
          isActive: true,
        },
      })
    );
    expect(result.response?.status).toBe(403);
  });

  it("allows a promoted user on the next request without a new JWT role", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-1", role: "user" },
    });
    mocks.findFirst.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      role: "admin",
      isActive: true,
    });

    const result = await requireAdminApi();

    expect(result.response).toBeNull();
    expect(result.admin?.role).toBe("admin");
  });

  it("redirects a demoted page session away from admin", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "admin-1", role: "admin" },
    });
    mocks.findFirst.mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/");
  });
});
