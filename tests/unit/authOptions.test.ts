import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  compare: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { compare: mocks.compare },
}));

vi.mock("@/utils/db", () => ({
  default: {
    user: {
      create: mocks.create,
      findFirst: mocks.findFirst,
    },
  },
}));

import { authOptions } from "@/utils/authOptions";

const credentialsProvider = authOptions.providers.find(
  (provider) => provider.id === "credentials"
);
const credentialsAuthorize = (
  credentialsProvider as unknown as {
    options: {
      authorize: (
        credentials: Record<string, string> | undefined,
        request: unknown
      ) => Promise<unknown>;
    };
  }
).options.authorize;
const sessionCallback = authOptions.callbacks?.session as unknown as (input: {
  session: {
    user: { id: string; role: "admin" | "user"; name: null; email: string; image: null };
    expires: string;
  };
  token: Record<string, unknown>;
}) => Promise<{ user: { id: string; role: "admin" | "user" } }>;

describe("authOptions", () => {
  beforeEach(() => {
    mocks.compare.mockReset();
    mocks.create.mockReset();
    mocks.findFirst.mockReset();
  });

  it("authorizes an active credentials user and normalizes their role", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      password: "password-hash",
      role: "admin",
      isActive: true,
    });
    mocks.compare.mockResolvedValue(true);

    const user = await credentialsAuthorize(
      { email: " User@Example.com ", password: "password" },
      {} as never
    );

    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
    expect(mocks.compare).toHaveBeenCalledWith("password", "password-hash");
    expect(user).toEqual({ id: "user-1", email: "user@example.com", role: "admin" });
  });

  it("rejects inactive credentials and OAuth users", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "user-2",
      email: "inactive@example.com",
      password: "password-hash",
      role: "user",
      isActive: false,
    });

    const credentialsUser = await credentialsAuthorize(
      { email: "inactive@example.com", password: "password" },
      {} as never
    );
    const oauthAllowed = await authOptions.callbacks?.signIn?.({
      user: { id: "user-2", email: "inactive@example.com", role: "user" },
      account: { provider: "github", type: "oauth", providerAccountId: "github-2" },
      profile: undefined,
      email: undefined,
      credentials: undefined,
    });

    expect(credentialsUser).toBeNull();
    expect(oauthAllowed).toBe(false);
    expect(mocks.compare).not.toHaveBeenCalled();
  });

  it("propagates user id and role through JWT and session callbacks", async () => {
    const token = await authOptions.callbacks?.jwt?.({
      token: { sub: "user-3" },
      user: { id: "user-3", role: "admin" },
      account: null,
      profile: undefined,
      trigger: "signIn",
      isNewUser: false,
    });
    const session = await sessionCallback({
      session: {
        user: { id: "", role: "user", name: null, email: "user@example.com", image: null },
        expires: new Date(Date.now() + 60_000).toISOString(),
      },
      token: token ?? {},
    });

    expect(token).toMatchObject({ id: "user-3", role: "admin" });
    expect(session?.user).toMatchObject({ id: "user-3", role: "admin" });
  });
});
