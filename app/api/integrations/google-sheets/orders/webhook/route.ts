import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getOrderSheetSyncConfig,
  verifyOrderSheetSignature,
} from "@/lib/orderSheetSyncAuth";
import {
  applyInboundOrderSheetStatus,
  InboundOrderSheetError,
} from "@/lib/orderSheetSync";
import { OrderSheetStatusError } from "@/lib/orderSheetStatus";
import prisma from "@/utils/db";

const bodySchema = z
  .object({
    orderId: z.string().uuid(),
    dbRevision: z.number().int().nonnegative(),
    sheetRevision: z.number().int().positive(),
    statusLabel: z.string().trim().min(1).max(40),
  })
  .strict();

function errorResponse(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  let config;
  try {
    config = getOrderSheetSyncConfig();
  } catch {
    return errorResponse(503, "ORDER_SHEET_SYNC_CONFIG_INVALID");
  }
  const timestamp = request.headers.get("x-order-sync-timestamp") || "";
  const eventId = request.headers.get("x-order-sync-event-id") || "";
  const signature = request.headers.get("x-order-sync-signature") || "";
  const rawBody = await request.text();
  if (
    !eventId ||
    eventId.length > 80 ||
    !verifyOrderSheetSignature({
      timestamp,
      eventId,
      signature,
      rawBody,
      secret: config.secret,
    })
  ) {
    return errorResponse(401, "UNAUTHORIZED");
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody || "null");
  } catch {
    return errorResponse(400, "INVALID_REQUEST");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, "INVALID_REQUEST");

  const actor = await prisma.user.findFirst({
    where: { id: config.actorId, role: "admin", isActive: true },
    select: { id: true },
  });
  if (!actor) {
    console.error("SYNC_ACTOR_INVALID", {
      orderId: parsed.data.orderId,
      eventId,
    });
    return errorResponse(503, "SYNC_ACTOR_INVALID");
  }

  try {
    const result = await applyInboundOrderSheetStatus(
      { ...parsed.data, eventId },
      actor.id
    );
    const status = result === "CONFLICT" || result === "REJECTED" ? 409 : 200;
    return NextResponse.json({ result }, { status });
  } catch (error) {
    if (error instanceof OrderSheetStatusError) {
      return errorResponse(400, error.code);
    }
    if (error instanceof InboundOrderSheetError) {
      const status = error.code === "ORDER_NOT_FOUND" ? 404 : 409;
      return errorResponse(status, error.code);
    }
    console.error("[order-sheet-sync] inbound apply failed", {
      orderId: parsed.data.orderId,
      eventId,
      code: "SHEET_STATUS_APPLY_FAILED",
    });
    return errorResponse(500, "SHEET_STATUS_APPLY_FAILED");
  }
}
