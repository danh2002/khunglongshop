import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { enqueueOrderSheetSync } from "@/lib/orderSheetSync";

const syncSource = readFileSync(resolve(process.cwd(), "lib/orderSheetSync.ts"), "utf8");
const scriptSource = readFileSync(
  resolve(process.cwd(), "integrations/google-apps-script/Code.gs"),
  "utf8"
);

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("order Sheet outbound synchronization", () => {
  it("enqueues without reading Google Sheets transport configuration", async () => {
    const upsert = vi.fn().mockResolvedValue({ orderId: "order-1" });
    const tx = { orderSheetSyncState: { upsert } };
    const previousValues = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      webAppUrl: process.env.GOOGLE_SHEETS_WEB_APP_URL,
      secret: process.env.GOOGLE_SHEETS_SYNC_SECRET,
      actorId: process.env.GOOGLE_SHEETS_SYNC_ACTOR_ID,
    };

    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "";
    process.env.GOOGLE_SHEETS_WEB_APP_URL = "";
    process.env.GOOGLE_SHEETS_SYNC_SECRET = "";
    process.env.GOOGLE_SHEETS_SYNC_ACTOR_ID = "";
    try {
      await expect(
        enqueueOrderSheetSync(tx as never, "order-1")
      ).resolves.toEqual({ orderId: "order-1" });
      expect(upsert).toHaveBeenCalledOnce();
    } finally {
      restoreEnv("GOOGLE_SHEETS_SPREADSHEET_ID", previousValues.spreadsheetId);
      restoreEnv("GOOGLE_SHEETS_WEB_APP_URL", previousValues.webAppUrl);
      restoreEnv("GOOGLE_SHEETS_SYNC_SECRET", previousValues.secret);
      restoreEnv("GOOGLE_SHEETS_SYNC_ACTOR_ID", previousValues.actorId);
    }
  });

  it("coalesces revisions and sends transport only from the flush path", () => {
    expect(syncSource).toContain("revision: { increment: 1 }");
    expect(syncSource).toContain('payload: { action: "upsertOrders", rows }');
    expect(syncSource).toContain("syncedRevision: state.revision");
    expect(syncSource).toContain("nextAttemptAt: retryAt(now, attempts)");
    expect(syncSource).toContain("AbortController");
    expect(syncSource).toContain("SHEET_SYNC_CONFIG_MISSING");
  });

  it("keeps Apps Script setup idempotent and fetch logs PII-free", () => {
    expect(scriptSource).toContain("sheet.getFrozenRows() === 0");
    expect(scriptSource).toContain("sheet.getFrozenColumns() === 0");
    expect(scriptSource).toContain("if (!statusRange.getDataValidation())");
    expect(scriptSource).toContain("muteHttpExceptions: true");
    expect(scriptSource).toContain("response.getResponseCode()");
    expect(scriptSource).not.toContain("response.getContentText()");
    expect(scriptSource).toContain("LEGACY_SHEET_ID = 0");
  });
});
