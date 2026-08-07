import type { OrderStatus } from "@prisma/client";

export const PAYMENT_WINDOW_MS = 5 * 60 * 1000;
export const PAYMENT_REF_MAX_ATTEMPTS = 3;

export class PaymentError extends Error {
  constructor(
    public readonly code:
      | "PAYMENT_CONFIG_INVALID"
      | "PAYMENT_REF_EXHAUSTED"
      | "PAYMENT_SESSION_UNAVAILABLE"
      | "PAYMENT_NOT_RENEWABLE"
      | "PAYMENT_CONFLICT"
  ) {
    super(code);
    this.name = "PaymentError";
  }
}

export type PaymentConfig = {
  bankId: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  template: string;
};

export type PaymentOrder = {
  id: string;
  orderNumber: number;
  name: string;
  lastname: string;
  status: OrderStatus;
  total: number;
  paymentRef: string | null;
  paymentExpiresAt: Date | null;
  paidAt: Date | null;
};

export type PaymentDto = {
  orderId: string;
  orderNumber: number;
  name: string;
  lastname: string;
  status: OrderStatus;
  total: number;
  paymentRef: string | null;
  paymentExpiresAt: string | null;
  paidAt: string | null;
  serverNow: string;
  qrImageUrl: string | null;
};

function requiredEnv(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) throw new PaymentError("PAYMENT_CONFIG_INVALID");
  return normalized;
}

export function getPaymentConfig(
  env: Record<string, string | undefined> = process.env
): PaymentConfig {
  const bankId = requiredEnv(env.VIETQR_BANK_ID);
  const bankName = env.VIETQR_BANK_NAME?.trim() || bankId;
  const accountNo = requiredEnv(env.VIETQR_ACCOUNT_NO);
  const accountName = requiredEnv(env.VIETQR_ACCOUNT_NAME);
  const template = env.VIETQR_TEMPLATE?.trim() || "compact2";

  if (!/^[A-Za-z0-9]+$/.test(bankId) || !/^\d{6,19}$/.test(accountNo)) {
    throw new PaymentError("PAYMENT_CONFIG_INVALID");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(template)) {
    throw new PaymentError("PAYMENT_CONFIG_INVALID");
  }

  return { bankId, bankName, accountNo, accountName, template };
}

export function generatePaymentRef(uuid = globalThis.crypto.randomUUID()) {
  const entropy = uuid.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 16);
  if (entropy.length < 12) throw new PaymentError("PAYMENT_REF_EXHAUSTED");
  return `KLS-${entropy}`;
}

export async function withPaymentRefRetry<T>(
  operation: (paymentRef: string) => Promise<T>,
  isPaymentRefConflict: (error: unknown) => boolean
) {
  for (let attempt = 1; attempt <= PAYMENT_REF_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation(generatePaymentRef());
    } catch (error) {
      if (!isPaymentRefConflict(error)) throw error;
      if (attempt === PAYMENT_REF_MAX_ATTEMPTS) {
        throw new PaymentError("PAYMENT_REF_EXHAUSTED");
      }
    }
  }

  throw new PaymentError("PAYMENT_REF_EXHAUSTED");
}

export function isPrismaPaymentRefConflict(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  if (error.code !== "P2002") return false;
  const meta = "meta" in error ? error.meta : null;
  const target =
    typeof meta === "object" && meta !== null && "target" in meta
      ? meta.target
      : null;
  return Array.isArray(target)
    ? target.some((value) => String(value).includes("paymentRef"))
    : String(target ?? "").includes("paymentRef");
}

export function buildVietQrUrl(
  config: PaymentConfig,
  amount: number,
  paymentRef: string
) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || !paymentRef.trim()) {
    throw new PaymentError("PAYMENT_CONFIG_INVALID");
  }

  const url = new URL(
    `https://img.vietqr.io/image/${encodeURIComponent(config.bankId)}-${encodeURIComponent(config.accountNo)}-${encodeURIComponent(config.template)}.png`
  );
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("addInfo", paymentRef);
  url.searchParams.set("accountName", config.accountName);
  return url.toString();
}

export function toPaymentDto(
  order: PaymentOrder,
  now = new Date(),
  config?: PaymentConfig
): PaymentDto {
  const hasPendingSession =
    order.status === "PENDING_PAYMENT" &&
    order.paymentRef !== null &&
    order.paymentExpiresAt !== null;
  const resolvedConfig = hasPendingSession ? config ?? getPaymentConfig() : null;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    name: order.name,
    lastname: order.lastname,
    status: order.status,
    total: order.total,
    paymentRef: order.paymentRef,
    paymentExpiresAt: order.paymentExpiresAt?.toISOString() ?? null,
    paidAt: order.paidAt?.toISOString() ?? null,
    serverNow: now.toISOString(),
    qrImageUrl:
      hasPendingSession && resolvedConfig
        ? buildVietQrUrl(resolvedConfig, order.total, order.paymentRef!)
        : null,
  };
}

export function calculatePaymentRemainingMs(
  paymentExpiresAt: string | null,
  serverNow: string,
  clientLoadTime: number,
  clientNow = Date.now()
) {
  if (!paymentExpiresAt) return 0;
  return Math.max(
    0,
    new Date(paymentExpiresAt).getTime() -
      new Date(serverNow).getTime() -
      (clientNow - clientLoadTime)
  );
}
