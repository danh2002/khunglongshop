import { Prisma } from "@prisma/client";
import { validateBlindBoxPool } from "@/lib/blindBox";
import prisma from "@/utils/db";

export async function publishBlindBoxPoolVersion(
  draftId: string,
  actorId: string
) {
  return prisma.$transaction(
    async (tx) => {
      const draft = await tx.blindBoxPoolVersion.findUnique({
        where: { id: draftId },
        include: {
          entries: {
            orderBy: { slotNumber: "asc" },
            include: {
              product: {
                select: {
                  id: true,
                  setId: true,
                  setSlotNumber: true,
                  isCollector: true,
                },
              },
            },
          },
        },
      });
      if (!draft) throw new Error("POOL_VERSION_NOT_FOUND");
      if (draft.status !== "DRAFT") throw new Error("POOL_VERSION_IMMUTABLE");

      const validation = validateBlindBoxPool(draft.entries);
      const invalidProduct = draft.entries.some(
        (entry) =>
          !entry.product.isCollector ||
          entry.product.setId !== draft.collectorSetId ||
          entry.product.setSlotNumber !== entry.slotNumber
      );
      if (!validation.valid || invalidProduct) {
        throw new Error("INVALID_POOL_VERSION");
      }

      const highest = await tx.blindBoxPoolVersion.aggregate({
        where: { collectorSetId: draft.collectorSetId, version: { gt: 0 } },
        _max: { version: true },
      });
      const nextVersion = (highest._max.version ?? 0) + 1;

      await tx.blindBoxPoolVersion.updateMany({
        where: { collectorSetId: draft.collectorSetId, status: "ACTIVE" },
        data: { status: "ARCHIVED", activeSetKey: null },
      });

      const published = await tx.blindBoxPoolVersion.create({
        data: {
          collectorSetId: draft.collectorSetId,
          version: nextVersion,
          status: "ACTIVE",
          activeSetKey: draft.collectorSetId,
          publishedAt: new Date(),
          entries: {
            create: draft.entries.map((entry) => ({
              productId: entry.productId,
              slotNumber: entry.slotNumber,
              drawWeight: entry.drawWeight,
              rarityTier: entry.rarityTier,
            })),
          },
        },
        include: {
          entries: {
            orderBy: { slotNumber: "asc" },
            include: { product: true },
          },
        },
      });

      await tx.blindBoxPoolVersion.update({
        where: { id: draft.id },
        data: { status: "ARCHIVED" },
      });
      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: "BLIND_BOX_POOL_PUBLISHED",
          entityType: "BlindBoxPoolVersion",
          entityId: published.id,
          metadata: {
            collectorSetId: draft.collectorSetId,
            sourceDraftId: draft.id,
            version: nextVersion,
            totalWeight: validation.totalWeight,
          },
        },
      });
      return published;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
  );
}
