import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { adminError } from "@/lib/adminResponses";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const versions = await prisma.blindBoxPoolVersion.findMany({
    where: { collectorSetId: id },
    orderBy: [{ status: "asc" }, { version: "desc" }],
    include: {
      entries: {
        orderBy: { slotNumber: "asc" },
        include: {
          product: {
            select: { id: true, title: true, slug: true, mainImage: true },
          },
        },
      },
      _count: { select: { allocations: true, orderItems: true } },
    },
  });

  return NextResponse.json(versions);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAdminApi();
  if (response || !session) return response;
  const { id } = await params;

  try {
    const draft = await prisma.$transaction(
      async (tx) => {
        const collectorSet = await tx.collectorSet.findUnique({
          where: { id },
          include: {
            products: {
              where: { isCollector: true, setSlotNumber: { not: null } },
              orderBy: { setSlotNumber: "asc" },
            },
            poolVersions: {
              where: { status: "ACTIVE" },
              take: 1,
              include: { entries: true },
            },
          },
        });
        if (!collectorSet) throw new Error("COLLECTOR_SET_NOT_FOUND");

        const existingDraft = await tx.blindBoxPoolVersion.findFirst({
          where: { collectorSetId: id, status: "DRAFT" },
          include: { entries: { orderBy: { slotNumber: "asc" } } },
        });
        if (existingDraft) return existingDraft;

        const minimumVersion = await tx.blindBoxPoolVersion.aggregate({
          where: { collectorSetId: id },
          _min: { version: true },
        });
        const draftVersion = Math.min(minimumVersion._min.version ?? 0, 0) - 1;
        const sourceEntries =
          collectorSet.poolVersions[0]?.entries.length
            ? collectorSet.poolVersions[0].entries
            : collectorSet.products.map((product) => ({
                productId: product.id,
                slotNumber: product.setSlotNumber!,
                drawWeight: product.setSlotNumber === 10 ? 10 : 100,
                rarityTier:
                  product.setSlotNumber === 10
                    ? ("LEGENDARY" as const)
                    : ("COMMON" as const),
              }));

        const created = await tx.blindBoxPoolVersion.create({
          data: {
            collectorSetId: id,
            version: draftVersion,
            status: "DRAFT",
            entries: {
              create: sourceEntries.map((entry) => ({
                productId: entry.productId,
                slotNumber: entry.slotNumber,
                drawWeight: entry.drawWeight,
                rarityTier: entry.rarityTier,
              })),
            },
          },
          include: { entries: { orderBy: { slotNumber: "asc" } } },
        });

        await tx.adminAuditLog.create({
          data: {
            actorId: session.user.id,
            action: "BLIND_BOX_POOL_DRAFT_CREATED",
            entityType: "BlindBoxPoolVersion",
            entityId: created.id,
            metadata: { collectorSetId: id },
          },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
    );

    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "COLLECTOR_SET_NOT_FOUND") {
      return adminError(404, error.message, "Không tìm thấy bộ sưu tập.");
    }
    throw error;
  }
}
