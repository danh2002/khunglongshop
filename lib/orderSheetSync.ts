import { OrderStatus, Prisma } from "@prisma/client";
import {
  createSignedOrderSheetEnvelope,
  getOrderSheetSyncConfig,
  OrderSheetSyncConfigError,
  type OrderSheetSyncConfig,
} from "@/lib/orderSheetSyncAuth";
import {
  fromOrderSheetStatus,
  toOrderSheetStatus,
} from "@/lib/orderSheetStatus";
import prisma from "@/utils/db";

export type OrderSheetTransaction = Prisma.TransactionClient | typeof prisma;

const orderSheetSelect = {
  id: true,
  orderNumber: true,
  name: true,
  lastname: true,
  phone: true,
  email: true,
  adress: true,
  apartment: true,
  city: true,
  country: true,
  postalCode: true,
  total: true,
  status: true,
  dateTime: true,
  products: {
    orderBy: { id: "asc" as const },
    select: { id: true, productTitle: true, quantity: true },
  },
} satisfies Prisma.Customer_orderSelect;

export type OrderSheetSource = Prisma.Customer_orderGetPayload<{
  select: typeof orderSheetSelect;
}>;

export type OrderSheetRow = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string;
  shippingAddress: string;
  products: string;
  total: number;
  status: string;
  createdAt: string;
  dbRevision: number;
  sheetRevision: number;
  syncError: string;
};

function joinNonEmpty(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}

export function serializeOrderSheetRow(
  order: OrderSheetSource,
  revisions: { dbRevision: number; sheetRevision: number }
): OrderSheetRow {
  return {
    orderId: order.id,
    orderNumber: `#${order.orderNumber}`,
    customerName: joinNonEmpty([order.name, order.lastname]).replace(/, /g, " "),
    phone: order.phone,
    email: order.email,
    shippingAddress: joinNonEmpty([
      order.apartment,
      order.adress,
      order.city,
      order.country,
      order.postalCode,
    ]),
    products: order.products
      .map((item) => `${item.productTitle} × ${item.quantity}`)
      .join("\n"),
    total: order.total,
    status: toOrderSheetStatus(order.status),
    createdAt: (order.dateTime ?? new Date(0)).toISOString(),
    dbRevision: revisions.dbRevision,
    sheetRevision: revisions.sheetRevision,
    syncError: "",
  };
}

export async function enqueueOrderSheetSync(
  tx: OrderSheetTransaction,
  orderId: string
) {
  return tx.orderSheetSyncState.upsert({
    where: { orderId },
    create: { orderId },
    update: {
      revision: { increment: 1 },
      nextAttemptAt: new Date(),
      lastErrorCode: null,
    },
  });
}

export async function ensureOrderSheetSync(
  tx: OrderSheetTransaction,
  orderId: string
) {
  return tx.orderSheetSyncState.upsert({
    where: { orderId },
    create: { orderId },
    update: {},
  });
}

function retryAt(now: Date, attempts: number) {
  const base = Math.min(60 * 60 * 1000, 1000 * 2 ** Math.min(attempts, 10));
  const jitter = Math.floor(base * 0.2 * Math.random());
  return new Date(now.getTime() + base + jitter);
}

type FlushOptions = {
  orderId?: string;
  limit?: number;
  now?: Date;
  fetchImpl?: typeof fetch;
  config?: OrderSheetSyncConfig;
};

type AppsScriptAcknowledgement = {
  orderId: string;
  revision: number;
  ok: boolean;
  errorCode?: string;
};

export async function flushOrderSheetSync(options: FlushOptions = {}) {
  const now = options.now ?? new Date();
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 50), 1), 100);
  const candidates = await prisma.orderSheetSyncState.findMany({
    where: {
      ...(options.orderId ? { orderId: options.orderId } : {}),
      nextAttemptAt: { lte: now },
    },
    orderBy: { nextAttemptAt: "asc" },
    take: limit * 3,
  });
  const pending = candidates
    .filter((state) => state.syncedRevision < state.revision)
    .slice(0, limit);
  if (pending.length === 0) {
    return { selected: 0, exported: 0, failed: 0, remaining: 0 };
  }

  const orders = await prisma.customer_order.findMany({
    where: { id: { in: pending.map(({ orderId }) => orderId) } },
    select: orderSheetSelect,
  });
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const rows = pending.flatMap((state) => {
    const order = orderById.get(state.orderId);
    return order
      ? [
          serializeOrderSheetRow(order, {
            dbRevision: state.revision,
            sheetRevision: state.sheetRevision,
          }),
        ]
      : [];
  });

  const config = options.config ?? getOrderSheetSyncConfig();
  const envelope = createSignedOrderSheetEnvelope({
    payload: { action: "upsertOrders", rows },
    secret: config.secret,
    now,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  let acknowledgements: AppsScriptAcknowledgement[] = [];
  try {
    const response = await (options.fetchImpl ?? fetch)(config.webAppUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(envelope),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("ORDER_SHEET_SYNC_HTTP_ERROR");
    const body = (await response.json()) as { acknowledgements?: unknown };
    if (!Array.isArray(body.acknowledgements)) {
      throw new Error("ORDER_SHEET_SYNC_RESPONSE_INVALID");
    }
    acknowledgements = body.acknowledgements.filter(
      (entry): entry is AppsScriptAcknowledgement =>
        typeof entry === "object" &&
        entry !== null &&
        typeof entry.orderId === "string" &&
        Number.isInteger(entry.revision) &&
        typeof entry.ok === "boolean"
    );
  } catch {
    acknowledgements = [];
  } finally {
    clearTimeout(timeout);
  }

  const ackByOrderId = new Map(acknowledgements.map((ack) => [ack.orderId, ack]));
  let exported = 0;
  let failed = 0;
  for (const state of pending) {
    const ack = ackByOrderId.get(state.orderId);
    if (ack?.ok && ack.revision === state.revision) {
      exported += 1;
      await prisma.orderSheetSyncState.updateMany({
        where: { orderId: state.orderId, revision: state.revision },
        data: {
          syncedRevision: state.revision,
          attempts: 0,
          lastErrorCode: null,
          lastSyncedAt: now,
        },
      });
    } else {
      failed += 1;
      const attempts = state.attempts + 1;
      await prisma.orderSheetSyncState.updateMany({
        where: { orderId: state.orderId, revision: state.revision },
        data: {
          attempts,
          nextAttemptAt: retryAt(now, attempts),
          lastErrorCode: (ack?.errorCode || "ORDER_SHEET_SYNC_FAILED").slice(0, 80),
        },
      });
    }
  }

  return {
    selected: pending.length,
    exported,
    failed,
    remaining: Math.max(0, candidates.length - pending.length),
  };
}

export async function bestEffortFlushOrderSheetSync(orderId: string) {
  try {
    return await flushOrderSheetSync({ orderId, limit: 1 });
  } catch (error) {
    if (error instanceof OrderSheetSyncConfigError) {
      console.warn("[order-sheet-sync] SHEET_SYNC_CONFIG_MISSING");
      return null;
    }
    console.warn("[order-sheet-sync] outbound flush deferred", { orderId });
    return null;
  }
}

export async function fetchChangedOrderSheetStatuses(options: {
  limit?: number;
  now?: Date;
  fetchImpl?: typeof fetch;
  config?: OrderSheetSyncConfig;
} = {}) {
  const config = options.config ?? getOrderSheetSyncConfig();
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 100), 1), 100);
  const envelope = createSignedOrderSheetEnvelope({
    payload: { action: "listChangedStatuses", limit },
    secret: config.secret,
    now: options.now,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await (options.fetchImpl ?? fetch)(config.webAppUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(envelope),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("ORDER_SHEET_SYNC_HTTP_ERROR");
    const body = (await response.json()) as { changes?: unknown };
    if (!Array.isArray(body.changes)) {
      throw new Error("ORDER_SHEET_SYNC_RESPONSE_INVALID");
    }
    return body.changes.filter(
      (entry): entry is Omit<InboundOrderSheetChange, "eventId"> =>
        typeof entry === "object" &&
        entry !== null &&
        typeof entry.orderId === "string" &&
        typeof entry.statusLabel === "string" &&
        Number.isInteger(entry.dbRevision) &&
        Number.isInteger(entry.sheetRevision)
    );
  } finally {
    clearTimeout(timeout);
  }
}

export type InboundOrderSheetChange = {
  eventId: string;
  orderId: string;
  dbRevision: number;
  sheetRevision: number;
  statusLabel: string;
};

export type InboundOrderSheetResult =
  | "APPLIED"
  | "DUPLICATE"
  | "NO_CHANGE"
  | "CONFLICT"
  | "REJECTED";

export class InboundOrderSheetError extends Error {
  constructor(
    public readonly code:
      | "ORDER_NOT_FOUND"
      | "SHEET_STATUS_TRANSITION_INVALID"
      | "SHEET_STATUS_APPLY_FAILED"
  ) {
    super(code);
    this.name = "InboundOrderSheetError";
  }
}

async function recordInboundResult(
  tx: Prisma.TransactionClient,
  input: InboundOrderSheetChange,
  actorId: string,
  outcome: InboundOrderSheetResult,
  previousStatus: OrderStatus,
  nextStatus: OrderStatus,
  errorCode?: string,
  advanceSheetRevision = true
) {
  await tx.orderSheetSyncEvent.create({
    data: {
      eventId: input.eventId,
      orderId: input.orderId,
      sheetRevision: input.sheetRevision,
      outcome,
      errorCode: errorCode?.slice(0, 80),
    },
  });
  await tx.orderSheetSyncState.upsert({
    where: { orderId: input.orderId },
    create: {
      orderId: input.orderId,
      sheetRevision: advanceSheetRevision ? input.sheetRevision : 0,
    },
    update: advanceSheetRevision
      ? { sheetRevision: Math.max(input.sheetRevision, 0) }
      : {},
  });
  if (outcome === "APPLIED") {
    await tx.adminAuditLog.create({
      data: {
        actorId,
        action: "ORDER_SHEET_STATUS_APPLIED",
        entityType: "Customer_order",
        entityId: input.orderId,
        metadata: {
          previousStatus,
          nextStatus,
          eventId: input.eventId,
          sheetRevision: input.sheetRevision,
        },
      },
    });
  }
}

export async function applyInboundOrderSheetStatus(
  input: InboundOrderSheetChange,
  actorId: string
): Promise<InboundOrderSheetResult> {
  const duplicate = await prisma.orderSheetSyncEvent.findUnique({
    where: { eventId: input.eventId },
    select: { eventId: true },
  });
  if (duplicate) return "DUPLICATE";

  const order = await prisma.customer_order.findUnique({
    where: { id: input.orderId },
    select: { id: true, status: true, sheetSyncState: true },
  });
  if (!order) throw new InboundOrderSheetError("ORDER_NOT_FOUND");
  const targetStatus = fromOrderSheetStatus(input.statusLabel);
  const syncState = order.sheetSyncState;

  if (
    (syncState && input.dbRevision < syncState.revision) ||
    (syncState && input.sheetRevision <= syncState.sheetRevision)
  ) {
    await prisma.$transaction(async (tx) => {
      await ensureOrderSheetSync(tx, order.id);
      await recordInboundResult(
        tx,
        input,
        actorId,
        "CONFLICT",
        order.status,
        order.status,
        "STALE_SHEET_REVISION",
        false
      );
    });
    await bestEffortFlushOrderSheetSync(order.id);
    return "CONFLICT";
  }

  if (targetStatus === order.status) {
    await prisma.$transaction((tx) =>
      recordInboundResult(
        tx,
        input,
        actorId,
        "NO_CHANGE",
        order.status,
        order.status
      )
    );
    return "NO_CHANGE";
  }

  const afterStatusChange = (tx: Prisma.TransactionClient) =>
    recordInboundResult(
      tx,
      input,
      actorId,
      "APPLIED",
      order.status,
      targetStatus
    );

  if (order.status === "PENDING_PAYMENT" && targetStatus === "PROCESSING") {
    const { confirmOrderPayment } = await import("@/lib/paymentConfirmation");
    await confirmOrderPayment({
      orderId: order.id,
      adminActorId: actorId,
      afterStatusChange,
    });
    return "APPLIED";
  }

  if (
    (order.status === "PENDING_PAYMENT" || order.status === "PROCESSING") &&
    targetStatus === "CANCELLED"
  ) {
    const { cancelOrder } = await import("@/lib/orderCancellation");
    await cancelOrder({
      orderId: order.id,
      adminActorId: actorId,
      reason: "GOOGLE_SHEETS_SYNC",
      afterStatusChange,
    });
    return "APPLIED";
  }

  if (order.status === "PROCESSING" && targetStatus === "COMPLETED") {
    const updated = await prisma.$transaction(
      async (tx) => {
        const changed = await tx.customer_order.updateMany({
          where: { id: order.id, status: "PROCESSING" },
          data: { status: "COMPLETED" },
        });
        if (changed.count !== 1) {
          throw new InboundOrderSheetError("SHEET_STATUS_APPLY_FAILED");
        }
        await afterStatusChange(tx);
        return changed;
      },
      { timeout: 15000, isolationLevel: undefined }
    );
    try {
      await enqueueOrderSheetSync(prisma, order.id);
    } catch (e) {
      console.warn("[order-sheet-sync] enqueue failed after sheet status apply:", e);
    }
    await bestEffortFlushOrderSheetSync(order.id);
    return "APPLIED";
  }

  await prisma.$transaction(async (tx) => {
    await ensureOrderSheetSync(tx, order.id);
    await recordInboundResult(
      tx,
      input,
      actorId,
      "REJECTED",
      order.status,
      order.status,
      "SHEET_STATUS_TRANSITION_INVALID"
    );
  });
  await bestEffortFlushOrderSheetSync(order.id);
  return "REJECTED";
}
