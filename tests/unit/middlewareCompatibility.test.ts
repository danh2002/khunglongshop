import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  next: vi.fn(() => ({ type: "next" })),
  redirect: vi.fn((url: URL) => ({ type: "redirect", url: url.toString() })),
  withAuth: vi.fn((handler, options) => {
    Object.assign(handler, { authOptions: options });
    return handler;
  }),
}));

vi.mock("next-auth/middleware", () => ({
  withAuth: mocks.withAuth,
}));

vi.mock("next/server", () => ({
  NextResponse: {
    next: mocks.next,
    redirect: mocks.redirect,
  },
}));

import middleware, { config } from "@/middleware";

type MiddlewareUnderTest = typeof middleware & {
  authOptions: {
    callbacks: { authorized: (params: { token: unknown }) => boolean };
    pages: { signIn: string };
  };
};

const protectedMiddleware = middleware as MiddlewareUnderTest;

describe("NextAuth v4 middleware compatibility", () => {
  it("requires a token for every configured protected route", () => {
    const authorized = protectedMiddleware.authOptions.callbacks.authorized;

    expect(authorized({ token: null })).toBe(false);
    expect(authorized({ token: { id: "user-1" } })).toBe(true);
    expect(protectedMiddleware.authOptions.pages.signIn).toBe("/login");
    expect(config.matcher).toEqual([
      "/account/:path*",
      "/admin/:path*",
      "/checkout/:path*",
    ]);
  });

  it("redirects non-admin users and permits admins on protected admin routes", async () => {
    const baseRequest = {
      nextUrl: { pathname: "/admin/orders" },
      url: "https://shop.example.com/admin/orders",
    };

    await protectedMiddleware({
      ...baseRequest,
      nextauth: { token: { role: "user" } },
    } as never, {} as never);
    expect(mocks.redirect).toHaveBeenCalledWith(new URL("https://shop.example.com/"));

    mocks.redirect.mockClear();
    await protectedMiddleware({
      ...baseRequest,
      nextauth: { token: { role: "admin" } },
    } as never, {} as never);
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.next).toHaveBeenCalled();
  });
});
