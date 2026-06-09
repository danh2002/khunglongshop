const STATIC_FILE_PATTERN = /\.(?:css|js|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf)$/i;

export function isMaintenanceBypassPath(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/game/redeem" ||
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/_next/image") ||
    pathname.startsWith("/images/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.png" ||
    STATIC_FILE_PATTERN.test(pathname)
  );
}
