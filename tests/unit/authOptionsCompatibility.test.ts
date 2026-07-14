import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  compare: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { compare: mocks.compare },
}));

vi.mock("@/utils/db", () => ({
  default: {
    user: {
      findFirst: mocks.findFirst,
    },
  },
}));

import { authOptions } from "@/utils/authOptions";

const credentialsProvider = authOptions.providers.find(
  (provider) => provider.id === "credentials"
);
const authorize = credentialsProvider?.options?.authorize;

describe("NextAuth v4 credentials and session compatibility", () => {
  beforeEach(() => {
    mocks.compare.mockReset();
    mocks.findFirst.mockReset();
  });

  it("authorizes an active credentials user and normalizes the role", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
      password: "hash",
      isActive: true,
      role: "admin",
    });
    mocks.compare.mockResolvedValue(true);

    const user = await authorize?.(
      { email: " Admin@Example.com ", password: "secret" },
      {} as never
    );

    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { email: "admin@example.com" },
    });
    expect(mocks.compare).toHaveBeenCalledWith("secret", "hash");
    expect(user).toEqual({
      id: "user-1",
      email: "admin@example.com",
      role: "admin",
    });
  });

  it("rejects an inactive credentials user", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "user-2",
      email: "inactive@example.com",
      password: "hash",
      isActive: false,
      role: "user",
    });

    const user = await authorize?.(
      { email: "inactive@example.com", password: "secret" },
      {} as never
    );

    expect(user).toBeNull();
    expect(mocks.compare).not.toHaveBeenCalled();
  });

  it("enriches a JWT with the signed-in user id and role", async () => {
    const token = await authOptions.callbacks?.jwt?.({
      token: { iat: Math.floor(Date.now() / 1000) },
      user: { id: "user-3", role: "admin" },
      account: null,
      profile: undefined,
      trigger: "signIn",
      isNewUser: false,
      session: undefined,
    });

    expect(token).toMatchObject({ id: "user-3", role: "admin" });
  });

  it("copies the JWT identity and role into the session", async () => {
    const session = await authOptions.callbacks?.session?.({
      session: {
        user: { id: "", email: "user@example.com", role: "user" },
        expires: new Date(Date.now() + 60_000).toISOString(),
      },
      token: { id: "user-4", role: "admin" },
      user: {
        id: "user-4",
        email: "user@example.com",
        emailVerified: null,
        role: "admin",
      },
      newSession: undefined,
      trigger: "update",
    });

    expect(session?.user).toMatchObject({ id: "user-4", role: "admin" });
  });
});
