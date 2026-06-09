import { describe, expect, it } from "vitest";
import { isMaintenanceBypassPath } from "@/lib/maintenance";

describe("maintenance allowlist", () => {
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
});
