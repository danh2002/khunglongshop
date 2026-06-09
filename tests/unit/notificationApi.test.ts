import { describe, expect, it } from "vitest";
import { buildNotificationListPath } from "@/lib/notification-api";

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
});
