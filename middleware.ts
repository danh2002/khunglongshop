import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Check for admin routes
    if (req.nextUrl.pathname.startsWith("/admin")) {
      if (req.nextauth.token?.role !== "admin") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    if (req.nextUrl.pathname.startsWith("/account") && !req.nextauth.token) {
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
        if (req.nextUrl.pathname.startsWith("/account")) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/account", "/account/:path*"]
};
