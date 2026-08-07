import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

export type OrderSheetSyncConfig = {
  spreadsheetId: string;
  tabName: string;
  webAppUrl: string;
  secret: string;
  actorId: string;
  timeoutMs: number;
};

export class OrderSheetSyncConfigError extends Error {
  constructor(public readonly code: "ORDER_SHEET_SYNC_CONFIG_INVALID") {
    super(code);
    this.name = "OrderSheetSyncConfigError";
  }
}

function required(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new OrderSheetSyncConfigError("ORDER_SHEET_SYNC_CONFIG_INVALID");
  }
  return normalized;
}

export function getOrderSheetSyncConfig(
  env: Record<string, string | undefined> = process.env
): OrderSheetSyncConfig {
  const spreadsheetId = required(env.GOOGLE_SHEETS_SPREADSHEET_ID);
  const tabName = required(env.GOOGLE_SHEETS_TAB_NAME);
  const webAppUrl = required(env.GOOGLE_SHEETS_WEB_APP_URL);
  const secret = required(env.GOOGLE_SHEETS_SYNC_SECRET);
  const actorId = required(env.GOOGLE_SHEETS_SYNC_ACTOR_ID);
  const timeoutMs = Number(env.ORDER_SHEET_SYNC_TIMEOUT_MS || 3000);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(webAppUrl);
  } catch {
    throw new OrderSheetSyncConfigError("ORDER_SHEET_SYNC_CONFIG_INVALID");
  }
  if (
    parsedUrl.protocol !== "https:" ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 500 ||
    timeoutMs > 10_000 ||
    secret.length < 32
  ) {
    throw new OrderSheetSyncConfigError("ORDER_SHEET_SYNC_CONFIG_INVALID");
  }

  return { spreadsheetId, tabName, webAppUrl, secret, actorId, timeoutMs };
}

export function createOrderSheetSignature(input: {
  timestamp: string;
  eventId: string;
  rawBody: string;
  secret: string;
}) {
  return createHmac("sha256", input.secret)
    .update(`${input.timestamp}\n${input.eventId}\n${input.rawBody}`, "utf8")
    .digest("hex");
}

export function verifyOrderSheetSignature(input: {
  timestamp: string;
  eventId: string;
  rawBody: string;
  signature: string;
  secret: string;
  now?: Date;
}) {
  const timestampMs = Date.parse(input.timestamp);
  const nowMs = (input.now ?? new Date()).getTime();
  if (!Number.isFinite(timestampMs) || Math.abs(nowMs - timestampMs) > SIGNATURE_MAX_AGE_MS) {
    return false;
  }
  if (!/^[a-f0-9]{64}$/.test(input.signature)) return false;
  const expected = createOrderSheetSignature(input);
  const actualBytes = Buffer.from(input.signature, "hex");
  const expectedBytes = Buffer.from(expected, "hex");
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

export function createSignedOrderSheetEnvelope<T>(input: {
  payload: T;
  secret: string;
  now?: Date;
  eventId?: string;
}) {
  const timestamp = (input.now ?? new Date()).toISOString();
  const eventId = input.eventId ?? randomUUID();
  const rawPayload = JSON.stringify(input.payload);
  const signature = createOrderSheetSignature({
    timestamp,
    eventId,
    rawBody: rawPayload,
    secret: input.secret,
  });
  return { timestamp, eventId, payload: input.payload, signature };
}
