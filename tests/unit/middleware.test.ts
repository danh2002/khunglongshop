import { describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({
  handler: undefined as ((request: any) => Promise<Response>) | undefined,
  options: undefined as
    | {
        callbacks: { authorized: (input: { token: unknown }) => boolean };
        pages: { signIn: string };
      }
    | undefined,
}));

vi.mock("next-auth/middleware", () => ({
  withAuth: vi.fn((handler, options) => {
    captured.handler = handler;
    captured.options = options;
    return handler;
  }),
}));

import { config } from "@/middleware";

describe("authentication middleware", () => {
  it("requires a token and redirects unauthenticated users to login", () => {
    expect(captured.options?.callbacks.authorized({ token: null })).toBe(false);
    expect(captured.options?.callbacks.authorized({ token: { sub: "user-1" } })).toBe(true);
    expect(captured.options?.pages.signIn).toBe("/login");
  });

  it("redirects non-admin users away from admin routes", async () => {
    const response = await captured.handler?.({
      nextUrl: { pathname: "/admin/products" },
      nextauth: { token: { role: "user" } },
      url: "https://shop.example/admin/products",
    });

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://shop.example/");
  });

  it("protects account, admin, and checkout routes", () => {
    expect(config.matcher).toEqual([
      "/account/:path*",
      "/admin/:path*",
      "/checkout/:path*",
    ]);
  });
});
