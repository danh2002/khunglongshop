import { describe, expect, it } from "vitest";
import {
  buildVietQrUrl,
  generatePaymentRef,
  getPaymentConfig,
  PaymentError,
  toPaymentDto,
  withPaymentRefRetry,
} from "@/lib/payment";

const config = {
  bankId: "970415",
  bankName: "VietinBank",
  accountNo: "123456789",
  accountName: "DAO KHUNG LONG",
  template: "compact2",
};

describe("payment helpers", () => {
  it("creates a compact uppercase transfer reference", () => {
    const ref = generatePaymentRef("12345678-1234-4abc-9def-1234567890ab");
    expect(ref).toBe("KLS-1234567812344ABC");
    expect(ref.length).toBeLessThanOrEqual(25);
    expect(ref).toMatch(/^KLS-[A-Z0-9]+$/);
  });

  it("rejects missing or malformed configuration without exposing values", () => {
    expect(() => getPaymentConfig({})).toThrowError(
      new PaymentError("PAYMENT_CONFIG_INVALID")
    );
    expect(() =>
      getPaymentConfig({
        VIETQR_BANK_ID: "970415",
        VIETQR_ACCOUNT_NO: "not-a-number",
        VIETQR_ACCOUNT_NAME: "TEST",
      })
    ).toThrowError("PAYMENT_CONFIG_INVALID");
  });

  it("builds an encoded VietQR URL with integer VND and transfer reference", () => {
    const url = new URL(buildVietQrUrl(config, 600_000, "KLS-ORDER 1"));
    expect(url.origin).toBe("https://img.vietqr.io");
    expect(url.pathname).toBe("/image/970415-123456789-compact2.png");
    expect(url.searchParams.get("amount")).toBe("600000");
    expect(url.searchParams.get("addInfo")).toBe("KLS-ORDER 1");
    expect(url.searchParams.get("accountName")).toBe("DAO KHUNG LONG");
  });

  it("returns QR data only for a pending payment session", () => {
    const now = new Date("2026-08-06T12:00:00.000Z");
    const dto = toPaymentDto(
      {
        id: "order-1",
        orderNumber: 1_000_004,
        name: "Danh",
        lastname: "Phạm",
        status: "PENDING_PAYMENT",
        total: 600_000,
        paymentRef: "KLS-ORDER1",
        paymentExpiresAt: new Date("2026-08-06T12:05:00.000Z"),
        paidAt: null,
      },
      now,
      config
    );
    expect(dto.serverNow).toBe(now.toISOString());
    expect(dto).toMatchObject({
      orderNumber: 1_000_004,
      name: "Danh",
      lastname: "Phạm",
    });
    expect(dto.qrImageUrl).toContain("amount=600000");

    expect(
      toPaymentDto(
        { ...dtoOrder(), status: "PROCESSING", paidAt: now },
        now,
        config
      ).qrImageUrl
    ).toBeNull();
  });

  it("retries payment reference conflicts three times and then fails typed", async () => {
    let attempts = 0;
    await expect(
      withPaymentRefRetry(
        async () => {
          attempts += 1;
          throw new Error("duplicate paymentRef");
        },
        () => true
      )
    ).rejects.toMatchObject({ code: "PAYMENT_REF_EXHAUSTED" });
    expect(attempts).toBe(3);
  });
});

function dtoOrder() {
  return {
    id: "order-1",
    orderNumber: 1_000_004,
    name: "Danh",
    lastname: "Phạm",
    status: "PENDING_PAYMENT" as const,
    total: 600_000,
    paymentRef: "KLS-ORDER1",
    paymentExpiresAt: new Date("2026-08-06T12:05:00.000Z"),
    paidAt: null,
  };
}
