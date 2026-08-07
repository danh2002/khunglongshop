import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { calculatePaymentRemainingMs } from "@/lib/payment";

const source = readFileSync(
  resolve(process.cwd(), "components/PaymentQrPanel.tsx"),
  "utf8"
);

describe("PaymentQrPanel", () => {
  it("shows a prominent transfer-reference warning before the countdown", () => {
    const notice =
      "⚠️ Hãy sao chép nội dung chuyển khoản và dán vào trước khi chuyển khoản";
    const noticeIndex = source.indexOf(notice);
    const countdownIndex = source.lastIndexOf('aria-live="polite"');

    expect(noticeIndex).toBeGreaterThan(-1);
    expect(noticeIndex).toBeLessThan(countdownIndex);
    expect(source).toContain("để bên Đảo Khủng Long có thể kiểm tra và xác nhận đơn nhanh nhất cho bạn!");
    expect(source).toContain('role="note"');
    expect(source).toContain("text-base font-semibold");
    expect(source).toContain("text-[#fbbf24]");
  });

  it("copies the customer name, formatted total, and display order number", () => {
    expect(source).toContain(
      "`${payment.name} ${payment.lastname} - ${formatVndTotal(payment.total)} - #${payment.orderNumber}`"
    );
    expect(source).toContain("navigator.clipboard.writeText(copyText)");
  });

  it("renders the shop payment QR asset", () => {
    expect(source).toContain('const PAYMENT_QR_IMAGE = "/images/payment-qr.jpg"');
    expect(source).toContain("src={PAYMENT_QR_IMAGE}");
    expect(source).toContain("{bankName}");
  });

  it("corrects countdown time using the initial server/client clock offset", () => {
    vi.setSystemTime(new Date("2026-08-06T12:00:02.000Z"));
    const remaining = calculatePaymentRemainingMs(
      "2026-08-06T12:05:00.000Z",
      "2026-08-06T12:00:00.000Z",
      new Date("2026-08-06T12:00:01.000Z").getTime(),
      Date.now()
    );
    expect(remaining).toBe(299_000);
    vi.useRealTimers();
  });

  it("polls without overlap and cleans timers and requests", () => {
    expect(source).toContain("if (inFlightRef.current) return");
    expect(source).toContain("window.clearInterval(countdown)");
    expect(source).toContain("window.clearInterval(polling)");
    expect(source).toContain("requestRef.current?.abort()");
  });

  it("has paid, expired, renewal, and QR fallback states", () => {
    expect(source).toContain("Thanh toán thành công");
    expect(source).toContain("Phiên thanh toán đã hết hạn");
    expect(source).toContain("Tạo mã QR mới");
    expect(source).toContain("Không tải được mã QR");
  });
});
