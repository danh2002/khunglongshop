import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  applyInboundOrderSheetStatus,
  ensureOrderSheetSync,
  fetchChangedOrderSheetStatuses,
  flushOrderSheetSync,
} from "@/lib/orderSheetSync";
import { getOrderSheetSyncConfig } from "@/lib/orderSheetSyncAuth";
import prisma from "@/utils/db";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`
  );
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const counts = {
    scanned: 0,
    exported: 0,
    imported: 0,
    duplicate: 0,
    conflict: 0,
    failed: 0,
    remaining: 0,
  };
  try {
    const config = getOrderSheetSyncConfig();
    const actor = await prisma.user.findFirst({
      where: { id: config.actorId, role: "admin", isActive: true },
      select: { id: true },
    });
    if (!actor) {
      console.error("SYNC_ACTOR_INVALID", { orderId: null, eventId: "cron" });
      return NextResponse.json(
        { error: "SYNC_ACTOR_INVALID", ...counts },
        { status: 503 }
      );
    }

    const outbound = await flushOrderSheetSync({ limit: 50, config });
    counts.exported = outbound.exported;
    counts.failed += outbound.failed;
    counts.remaining = outbound.remaining;

    const changes = await fetchChangedOrderSheetStatuses({ limit: 100, config });
    counts.scanned = changes.length;
    for (const change of changes) {
      try {
        const result = await applyInboundOrderSheetStatus(
          {
            ...change,
            eventId: `${change.orderId}:${change.sheetRevision}`,
          },
          actor.id
        );
        if (result === "APPLIED" || result === "NO_CHANGE") counts.imported += 1;
        else if (result === "DUPLICATE") counts.duplicate += 1;
        else counts.conflict += 1;
      } catch {
        counts.failed += 1;
      }
    }
    return NextResponse.json({ success: true, ...counts });
  } catch {
    counts.failed += 1;
    return NextResponse.json(
      { error: "ORDER_SHEET_SYNC_FAILED", ...counts },
      { status: 503 }
    );
  }
}

const backfillSchema = z
  .object({
    confirm: z.literal("ENQUEUE").optional(),
    cursor: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).default(100),
  })
  .strict();

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const parsed = backfillSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  const orders = await prisma.customer_order.findMany({
    where: parsed.data.cursor ? { id: { gt: parsed.data.cursor } } : undefined,
    orderBy: { id: "asc" },
    take: parsed.data.limit,
    select: { id: true },
  });
  if (parsed.data.confirm === "ENQUEUE") {
    await prisma.$transaction(async (tx) => {
      for (const order of orders) await ensureOrderSheetSync(tx, order.id);
    });
  }
  return NextResponse.json({
    dryRun: parsed.data.confirm !== "ENQUEUE",
    selected: orders.length,
    nextCursor: orders.at(-1)?.id ?? null,
  });
}
