import { NextResponse } from "next/server";

const STATIC_FILE_PATTERN = /\.(?:css|js|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf)$/i;

export const MAINTENANCE_CHECK_HEADER = "x-kls-maintenance-check";

type PublicSettingsResponse = {
  maintenanceMode?: unknown;
};

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

export function isInternalMaintenanceCheck(
  pathname: string,
  headerValue: string | null
) {
  return (
    pathname === "/api/public/settings" &&
    headerValue === "1"
  );
}

export async function getMaintenanceMode(requestUrl: string) {
  try {
    const settingsUrl = new URL("/api/public/settings", requestUrl);
    const response = await fetch(settingsUrl, {
      cache: "no-store",
      headers: { [MAINTENANCE_CHECK_HEADER]: "1" },
    });

    if (!response.ok) {
      console.error("[maintenance] Unable to load site settings", {
        status: response.status,
      });
      return false;
    }

    const settings = (await response.json()) as PublicSettingsResponse;
    return settings.maintenanceMode === true;
  } catch (error) {
    console.error("[maintenance] Unable to load site settings", error);
    return false;
  }
}

export function createMaintenanceResponse(pathname: string) {
  const headers = {
    "Cache-Control": "no-store, max-age=0",
    "Retry-After": "3600",
  };

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: {
          code: "MAINTENANCE_MODE",
          message: "Hệ thống đang bảo trì.",
        },
      },
      { status: 503, headers }
    );
  }

  return new NextResponse(
    `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hệ thống đang bảo trì | Khủng Long Shop</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #070707; color: #fff; font-family: Arial, sans-serif; }
      main { width: min(680px, 100%); padding: clamp(32px, 7vw, 72px); border: 1px solid rgba(232, 93, 0, .45); background: #111; text-align: center; }
      img { width: 72px; height: 72px; object-fit: contain; }
      p:first-of-type { margin: 24px 0 8px; color: #e85d00; font-size: 13px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
      h1 { margin: 0; font-size: clamp(32px, 8vw, 64px); font-style: italic; line-height: .95; text-transform: uppercase; }
      p:last-of-type { margin: 24px auto 0; max-width: 480px; color: rgba(255, 255, 255, .62); line-height: 1.7; }
    </style>
  </head>
  <body>
    <main>
      <img src="/images/logo.png" alt="Khủng Long Shop" />
      <p>Khủng Long Shop</p>
      <h1>Hệ thống đang bảo trì</h1>
      <p>Website đang được nâng cấp. Vui lòng quay lại sau ít phút.</p>
    </main>
  </body>
</html>`,
    {
      status: 503,
      headers: {
        ...headers,
        "Content-Type": "text/html; charset=utf-8",
      },
    }
  );
}
