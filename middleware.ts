import { withAuth } from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createMaintenanceResponse,
  getMaintenanceMode,
  isInternalMaintenanceCheck,
  isMaintenanceBypassPath,
  MAINTENANCE_CHECK_HEADER,
} from "@/lib/maintenance";

const protectedRouteMiddleware = withAuth(
  async function middleware(req) {
    const pathname = req.nextUrl.pathname;
    if (pathname.startsWith("/admin") && req.nextauth.token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

function isProtectedRoute(pathname: string) {
  return (
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/")
  );
}

export default async function middleware(
  req: NextRequest,
  event: NextFetchEvent
) {
  const pathname = req.nextUrl.pathname;
  const internalMaintenanceCheck = isInternalMaintenanceCheck(
    pathname,
    req.headers.get(MAINTENANCE_CHECK_HEADER)
  );

  if (
    !internalMaintenanceCheck &&
    !isMaintenanceBypassPath(pathname) &&
    (await getMaintenanceMode(req.url))
  ) {
    return createMaintenanceResponse(pathname);
  }

  if (isProtectedRoute(pathname)) {
    return protectedRouteMiddleware(
      req as NextRequestWithAuth,
      event
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
