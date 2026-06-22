import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildNotificationListPath,
  isSilentUnreadCountError,
  notificationApi,
  NotificationRequestError,
} from "@/lib/notification-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("notification API paths", () => {
  it("uses the same-origin Next.js API instead of the external API base URL", () => {
    const path = buildNotificationListPath({
      page: 2,
      limit: 20,
      isRead: false,
    });

    expect(path).toBe("/api/notifications?page=2&limit=20&isRead=false");
    expect(path).not.toContain("localhost:3001");
    expect(path).not.toContain("userId");
  });

  it("classifies maintenance unread-count failures as silent polling errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          error: {
            code: "MAINTENANCE_MODE",
            message: "Hệ thống đang bảo trì.",
          },
        }),
      })
    );

    await expect(notificationApi.getUnreadCount()).rejects.toMatchObject({
      name: "NotificationRequestError",
      status: 503,
      code: "MAINTENANCE_MODE",
      message: "Hệ thống đang bảo trì.",
    });

    const error = new NotificationRequestError("Hệ thống đang bảo trì.", 503, "MAINTENANCE_MODE");
    expect(isSilentUnreadCountError(error)).toBe(true);
    expect(isSilentUnreadCountError(new NotificationRequestError("Boom", 500))).toBe(false);
  });
});
