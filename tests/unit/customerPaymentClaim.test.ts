import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  resolve(process.cwd(), "app/api/payment/customer-confirm/route.ts"),
  "utf8"
);
const adminPage = readFileSync(
  resolve(process.cwd(), "app/(dashboard)/admin/orders/[id]/page.tsx"),
  "utf8"
);

describe("customer payment claim", () => {
  it("persists the submitted reference and claim timestamp in the existing transaction", () => {
    expect(route).toContain('const claimedRef = typeof body?.claimedRef === "string" ? body.claimedRef.trim() : null;');
    expect(route).toContain("if (!orderId || !claimedRef)");
    expect(route).toContain("customerClaimedAt: now,");
    expect(route).toContain("customerClaimedRef: claimedRef,");
  });

  it("shows customer claim data after the payment reference in the admin payment section", () => {
    const paymentRefIndex = adminPage.indexOf("Mã chuyển khoản");
    const claimedAtIndex = adminPage.indexOf("Khách hàng xác nhận lúc");
    const claimedRefIndex = adminPage.indexOf("Nội dung KH nhập");

    expect(claimedAtIndex).toBeGreaterThan(paymentRefIndex);
    expect(claimedRefIndex).toBeGreaterThan(claimedAtIndex);
    expect(adminPage).toContain('order.customerClaimedAt?.toLocaleString("vi-VN") ?? "Chưa xác nhận"');
    expect(adminPage).toContain('className="font-mono text-xs text-white/80"');
    expect(adminPage).toContain('order.customerClaimedRef ?? "—"');
  });
});
