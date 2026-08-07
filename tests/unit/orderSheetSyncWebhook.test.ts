import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  resolve(process.cwd(), "app/api/integrations/google-sheets/orders/webhook/route.ts"),
  "utf8"
);
const sync = readFileSync(resolve(process.cwd(), "lib/orderSheetSync.ts"), "utf8");

describe("order Sheet inbound webhook", () => {
  it("verifies the raw body before strict validation and DB mutation", () => {
    const rawBody = route.indexOf("const rawBody = await request.text()");
    const signature = route.indexOf("verifyOrderSheetSignature");
    const actor = route.indexOf("prisma.user.findFirst");
    expect(rawBody).toBeGreaterThan(-1);
    expect(signature).toBeLessThan(actor);
    expect(route).toContain(".strict()");
    expect(route).toContain('errorResponse(401, "UNAUTHORIZED")');
  });

  it("requires an active admin actor and emits the typed non-PII code", () => {
    expect(route).toContain('role: "admin", isActive: true');
    expect(route).toContain('console.error("SYNC_ACTOR_INVALID"');
    expect(route).toContain('errorResponse(503, "SYNC_ACTOR_INVALID")');
    expect(route).not.toContain("parsed.data.statusLabel,");
  });

  it("uses domain services, revisions, idempotency, and audit", () => {
    expect(sync).toContain("orderSheetSyncEvent.findUnique");
    expect(sync).toContain("STALE_SHEET_REVISION");
    expect(sync).toContain('import("@/lib/paymentConfirmation")');
    expect(sync).toContain('import("@/lib/orderCancellation")');
    expect(sync).toContain('action: "ORDER_SHEET_STATUS_APPLIED"');
    expect(sync).toContain("SHEET_STATUS_TRANSITION_INVALID");
  });
});
