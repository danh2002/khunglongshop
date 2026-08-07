import { describe, expect, it } from "vitest";
import {
  createOrderSheetSignature,
  getOrderSheetSyncConfig,
  verifyOrderSheetSignature,
} from "@/lib/orderSheetSyncAuth";

const secret = "a".repeat(32);

describe("order Sheet sync authentication", () => {
  it("validates configuration and timeout bounds", () => {
    const config = getOrderSheetSyncConfig({
      GOOGLE_SHEETS_SPREADSHEET_ID: "sheet-id",
      GOOGLE_SHEETS_TAB_NAME: "Đơn hàng đồng bộ",
      GOOGLE_SHEETS_WEB_APP_URL: "https://script.google.com/macros/s/test/exec",
      GOOGLE_SHEETS_SYNC_SECRET: secret,
      GOOGLE_SHEETS_SYNC_ACTOR_ID: "admin-id",
      ORDER_SHEET_SYNC_TIMEOUT_MS: "2500",
    });
    expect(config.timeoutMs).toBe(2500);
    expect(() => getOrderSheetSyncConfig({})).toThrow(
      "ORDER_SHEET_SYNC_CONFIG_INVALID"
    );
  });

  it("accepts only fresh signatures for the exact raw body", () => {
    const now = new Date("2026-08-07T02:00:00.000Z");
    const input = {
      timestamp: now.toISOString(),
      eventId: "event-1",
      rawBody: '{"status":"Đang xử lý"}',
      secret,
    };
    const signature = createOrderSheetSignature(input);
    expect(verifyOrderSheetSignature({ ...input, signature, now })).toBe(true);
    expect(
      verifyOrderSheetSignature({
        ...input,
        rawBody: `${input.rawBody} `,
        signature,
        now,
      })
    ).toBe(false);
    expect(
      verifyOrderSheetSignature({
        ...input,
        signature,
        now: new Date(now.getTime() + 6 * 60 * 1000),
      })
    ).toBe(false);
    expect(verifyOrderSheetSignature({ ...input, signature: "bad", now })).toBe(false);
  });
});
