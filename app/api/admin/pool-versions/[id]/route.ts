import { RarityTier } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  MAX_DRAW_WEIGHT,
  MIN_DRAW_WEIGHT,
  validateBlindBoxPool,
} from "@/lib/blindBox";
import { adminError, validationError } from "@/lib/adminResponses";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

const entrySchema = z.object({
  productId: z.string().trim().min(1),
  slotNumber: z.number().int().min(1).max(10),
  drawWeight: z.number().int().min(MIN_DRAW_WEIGHT).max(MAX_DRAW_WEIGHT),
  rarityTier: z.nativeEnum(RarityTier),
});

const updateSchema = z.object({
  entries: z.array(entrySchema).length(10),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAdminApi();
  if (response || !session) return response;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const poolValidation = validateBlindBoxPool(parsed.data.entries);
  if (!poolValidation.valid) {
    return adminError(
      422,
      "INVALID_POOL_WEIGHTS",
      "Phiên bản tỷ lệ chưa hợp lệ. Tổng trọng số tối đa là 10.000.000."
    );
  }
  const { id } = await params;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const draft = await tx.blindBoxPoolVersion.findUnique({
        where: { id },
        include: { collectorSet: true },
      });
      if (!draft) throw new Error("POOL_VERSION_NOT_FOUND");
      if (draft.status !== "DRAFT") throw new Error("POOL_VERSION_IMMUTABLE");

      const products = await tx.product.findMany({
        where: { id: { in: parsed.data.entries.map((entry) => entry.productId) } },
        select: {
          id: true,
          setId: true,
          setSlotNumber: true,
          isCollector: true,
        },
      });
      const byId = new Map(products.map((product) => [product.id, product]));
      const invalid = parsed.data.entries.some((entry) => {
        const product = byId.get(entry.productId);
        return (
          !product ||
          !product.isCollector ||
          product.setId !== draft.collectorSetId ||
          product.setSlotNumber !== entry.slotNumber
        );
      });
      if (invalid) throw new Error("INVALID_POOL_PRODUCT");

      await tx.blindBoxPoolEntry.deleteMany({ where: { poolVersionId: id } });
      await tx.blindBoxPoolEntry.createMany({
        data: parsed.data.entries.map((entry) => ({
          poolVersionId: id,
          ...entry,
        })),
      });
      await tx.adminAuditLog.create({
        data: {
          actorId: session.user.id,
          action: "BLIND_BOX_POOL_DRAFT_UPDATED",
          entityType: "BlindBoxPoolVersion",
          entityId: id,
          metadata: { collectorSetId: draft.collectorSetId },
        },
      });

      return tx.blindBoxPoolVersion.findUniqueOrThrow({
        where: { id },
        include: {
          entries: {
            orderBy: { slotNumber: "asc" },
            include: { product: true },
          },
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "POOL_VERSION_NOT_FOUND" ? 404 : 409;
    return adminError(status, code || "POOL_UPDATE_FAILED", "Không thể cập nhật phiên bản tỷ lệ.");
  }
}
