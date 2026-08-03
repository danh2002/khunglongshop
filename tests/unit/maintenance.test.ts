import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NextFetchEvent } from "next/server";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import maintenanceMiddleware from "../../middleware";
import {
  createMaintenanceResponse,
  getMaintenanceMode,
  isInternalMaintenanceCheck,
  isMaintenanceBypassPath,
  MAINTENANCE_CHECK_HEADER,
} from "@/lib/maintenance";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("maintenance allowlist", () => {
  it("wires the maintenance check into the global middleware matcher", () => {
    const middleware = readFileSync(
      resolve(process.cwd(), "middleware.ts"),
      "utf8"
    );

    expect(middleware).toContain("await getMaintenanceMode(req.url)");
    expect(middleware).toContain("createMaintenanceResponse(pathname)");
    expect(middleware).toContain('matcher: ["/:path*"]');
  });

  it.each([
    ["https://shop.test/", "text/html"],
    ["https://shop.test/shop", "text/html"],
    ["https://shop.test/api/orders", "application/json"],
  ])("blocks %s through the real middleware", async (url, contentType) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ maintenanceMode: true }),
      })
    );

    const response = await maintenanceMiddleware(
      new NextRequest(url),
      {} as NextFetchEvent
    );

    expect(response?.status).toBe(503);
    expect(response?.headers.get("content-type")).toContain(contentType);
  });

  it("does not query maintenance state for allowlisted APIs", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await maintenanceMiddleware(
      new NextRequest("https://shop.test/api/admin/orders"),
      {} as NextFetchEvent
    );

    expect(response?.headers.get("x-middleware-next")).toBe("1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    "/admin",
    "/admin/orders/1",
    "/api/admin/orders",
    "/api/auth/session",
    "/api/game/redeem",
    "/_next/static/chunks/app.js",
    "/_next/image",
    "/images/logo.png",
    "/favicon.ico",
  ])("bypasses %s", (pathname) => {
    expect(isMaintenanceBypassPath(pathname)).toBe(true);
  });

  it.each([
    "/",
    "/shop",
    "/checkout",
    "/api/orders",
    "/api/game/redeem-extra",
    "/api/admin-public",
  ])("blocks %s", (pathname) => {
    expect(isMaintenanceBypassPath(pathname)).toBe(false);
  });

  it("allows only the middleware's exact internal settings request", () => {
    expect(isInternalMaintenanceCheck("/api/public/settings", "1")).toBe(true);
    expect(isInternalMaintenanceCheck("/api/public/settings", null)).toBe(false);
    expect(isInternalMaintenanceCheck("/api/orders", "1")).toBe(false);
  });

  it("reads the live maintenance value without caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ maintenanceMode: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getMaintenanceMode("https://shop.test/products")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://shop.test/api/public/settings"),
      expect.objectContaining({
        cache: "no-store",
        headers: { [MAINTENANCE_CHECK_HEADER]: "1" },
      })
    );
  });

  it("fails open when settings cannot be loaded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(getMaintenanceMode("https://shop.test/")).resolves.toBe(false);
  });

  it("returns a maintenance page for storefront requests", async () => {
    const response = createMaintenanceResponse("/shop");

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("text/html");
    await expect(response.text()).resolves.toContain("Hệ thống đang bảo trì");
  });

  it("returns a stable maintenance error for public APIs", async () => {
    const response = createMaintenanceResponse("/api/orders");

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "MAINTENANCE_MODE",
        message: "Hệ thống đang bảo trì.",
      },
    });
  });
});
