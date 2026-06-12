import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { isMaintenanceBypassPath } from "@/lib/maintenance";
import prisma from "@/utils/db";

let maintenanceCache = {
  value: false,
  expiresAt: 0,
};

async function isMaintenanceEnabled() {
  const now = Date.now();
  if (maintenanceCache.expiresAt > now) return maintenanceCache.value;

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 1 },
    select: { maintenanceMode: true },
  });
  maintenanceCache = {
    value: settings?.maintenanceMode ?? false,
    expiresAt: now + 5_000,
  };
  return maintenanceCache.value;
}

export default withAuth(
  async function middleware(req) {
    const pathname = req.nextUrl.pathname;

    if (!isMaintenanceBypassPath(pathname) && (await isMaintenanceEnabled())) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: { code: "MAINTENANCE_MODE", message: "Hệ thống đang bảo trì." } },
          { status: 503 }
        );
      }

      return new NextResponse(
        `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Đang bảo trì</title></head><body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#070707;color:#fff;font-family:Arial,sans-serif"><main style="max-width:560px;padding:32px;border-top:3px solid #e85d00"><p style="color:#e85d00;font-weight:800;text-transform:uppercase">Khủng Long Shop</p><h1>Hệ thống đang bảo trì</h1><p style="color:#aaa;line-height:1.6">Chúng tôi đang cập nhật cửa hàng. Vui lòng quay lại sau.</p></main></body></html>`,
        { status: 503, headers: { "content-type": "text/html; charset=utf-8" } }
      );
    }

    // Check for admin routes
    if (pathname.startsWith("/admin")) {
      if (req.nextauth.token?.role !== "admin") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    if (
      (pathname.startsWith("/account") ||
        pathname.startsWith("/checkout") ||
        pathname.startsWith("/order-confirmation")) &&
      !req.nextauth.token
    ) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Admin routes require admin token
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return !!token && token.role === "admin";
        }
        if (
          req.nextUrl.pathname.startsWith("/account") ||
          req.nextUrl.pathname.startsWith("/checkout") ||
          req.nextUrl.pathname.startsWith("/order-confirmation")
        ) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image).*)"],
};
