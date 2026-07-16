import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import {
  collectorSetHeroFieldSchemas,
  normalizeCollectorSetHeroData,
  validateCollectorSetHeroFields,
} from "@/lib/collectorSetHeroAdmin";
import {
  adminError,
  isPrismaUniqueError,
  normalizeDisplayName,
  validationError,
} from "@/lib/adminResponses";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";
import { toSlug } from "@/lib/slug";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().max(120).optional(),
  image: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  rewardDescription: z.string().trim().max(500).nullable().optional(),
  rewardCodeTemplate: z.string().trim().max(100).nullable().optional(),
  slots: z
    .array(z.object({ slotNumber: z.number().int().min(1).max(10), productId: z.string().nullable() }))
    .length(10)
    .optional(),
  ...collectorSetHeroFieldSchemas,
}).superRefine(validateCollectorSetHeroFields);

async function findSet(id: string) {
  return prisma.collectorSet.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { setSlotNumber: "asc" },
        select: {
          id: true,
          title: true,
          slug: true,
          mainImage: true,
          setSlotNumber: true,
          _count: { select: { redemptionCodes: true } },
        },
      },
      _count: { select: { products: true, setRewards: true } },
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const set = await findSet(id);
  if (!set) return adminError(404, "COLLECTOR_SET_NOT_FOUND", "Không tìm thấy bộ sưu tập.");
  const bySlot = new Map(set.products.map((product) => [product.setSlotNumber, product]));
  return NextResponse.json({
    ...set,
    slots: Array.from({ length: 10 }, (_, index) => ({
      slotNumber: index + 1,
      product: bySlot.get(index + 1) ?? null,
    })),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const { id } = await params;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.collectorSet.findUnique({ where: { id } });
      if (!existing) throw new Error("COLLECTOR_SET_NOT_FOUND");

      if (parsed.data.slots) {
        const assignedIds = parsed.data.slots
          .map((slot) => slot.productId)
          .filter((productId): productId is string => Boolean(productId));
        if (new Set(assignedIds).size !== assignedIds.length) {
          throw new Error("DUPLICATE_SLOT_PRODUCT");
        }
        const currentProducts = await tx.product.findMany({
          where: { setId: id },
          select: { id: true, setSlotNumber: true, _count: { select: { redemptionCodes: true } } },
        });
        for (const product of currentProducts) {
          const next = parsed.data.slots.find((slot) => slot.productId === product.id);
          if (
            product._count.redemptionCodes > 0 &&
            (!next || next.slotNumber !== product.setSlotNumber)
          ) {
            throw new Error("PRODUCT_WITH_CODES_CANNOT_MOVE");
          }
        }
        await tx.product.updateMany({
          where: { setId: id, id: { notIn: assignedIds } },
          data: { setId: null, setSlotNumber: null, isCollector: false },
        });
        for (const slot of parsed.data.slots) {
          if (slot.productId) {
            await tx.product.update({
              where: { id: slot.productId },
              data: { setId: id, setSlotNumber: slot.slotNumber, isCollector: true },
            });
          }
        }
      }

      await tx.collectorSet.update({
        where: { id },
        data: {
          ...(parsed.data.name ? { name: normalizeDisplayName(parsed.data.name) } : {}),
          ...(parsed.data.slug !== undefined
            ? { slug: toSlug(parsed.data.slug || parsed.data.name || existing.name) }
            : parsed.data.name
              ? { slug: toSlug(parsed.data.name) }
              : {}),
          ...(parsed.data.image !== undefined ? { image: parsed.data.image || null } : {}),
          ...(parsed.data.description !== undefined
            ? { description: parsed.data.description || null }
            : {}),
          ...(parsed.data.rewardDescription !== undefined
            ? { rewardDescription: parsed.data.rewardDescription || null }
            : {}),
          ...(parsed.data.rewardCodeTemplate !== undefined
            ? { rewardCodeTemplate: parsed.data.rewardCodeTemplate || null }
            : {}),
          ...normalizeCollectorSetHeroData(parsed.data),
        },
      });
    });
    revalidateTag("navbar-navigation");
    revalidatePath("/", "layout");
    revalidatePath("/bo-suu-tap");
    return NextResponse.json(await findSet(id));
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return adminError(409, "COLLECTOR_SET_SLUG_EXISTS", "Tên hoặc slug bộ sưu tập đã tồn tại.");
    }
    const code = error instanceof Error ? error.message : "";
    if (code === "COLLECTOR_SET_NOT_FOUND") {
      return adminError(404, code, "Không tìm thấy bộ sưu tập.");
    }
    if (code === "DUPLICATE_SLOT_PRODUCT" || code === "PRODUCT_WITH_CODES_CANNOT_MOVE") {
      return adminError(409, code, "Không thể thay đổi slot sản phẩm đã có lịch sử code.");
    }
    throw error;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const force = new URL(request.url).searchParams.get("force") === "true";
  const set = await findSet(id);
  if (!set) return adminError(404, "COLLECTOR_SET_NOT_FOUND", "Không tìm thấy bộ sưu tập.");
  const codeCount = set.products.reduce(
    (sum, product) => sum + product._count.redemptionCodes,
    0
  );
  const hasHistory = set._count.products > 0 || set._count.setRewards > 0 || codeCount > 0;

  if (hasHistory && !force) {
    return adminError(
      409,
      "COLLECTOR_SET_HAS_HISTORY",
      "Không thể xóa bộ sưu tập còn sản phẩm, code hoặc phần thưởng."
    );
  }

  await prisma.$transaction(async (tx) => {
    const productIds = set.products.map((product) => product.id);
    const poolVersions = await tx.blindBoxPoolVersion.findMany({
      where: { collectorSetId: id },
      select: { id: true },
    });
    const poolVersionIds = poolVersions.map((version) => version.id);

    if (force && poolVersionIds.length > 0) {
      await tx.redemptionCode.deleteMany({
        where: {
          OR: [
            { allocation: { poolVersionId: { in: poolVersionIds } } },
            ...(productIds.length > 0 ? [{ productId: { in: productIds } }] : []),
          ],
        },
      });
      await tx.blindBoxAllocation.deleteMany({
        where: { poolVersionId: { in: poolVersionIds } },
      });
      await tx.blindBoxPoolEntry.deleteMany({
        where: { poolVersionId: { in: poolVersionIds } },
      });
      await tx.customer_order_product.updateMany({
        where: { poolVersionId: { in: poolVersionIds } },
        data: { poolVersionId: null },
      });
      await tx.blindBoxPoolVersion.deleteMany({
        where: { collectorSetId: id },
      });
    } else if (force && productIds.length > 0) {
      await tx.redemptionCode.deleteMany({
        where: { productId: { in: productIds } },
      });
    }

    if (force) {
      await tx.setReward.deleteMany({ where: { setId: id } });
      await tx.product.updateMany({
        where: { setId: id },
        data: { setId: null, setSlotNumber: null, isCollector: false },
      });
      await tx.product.updateMany({
        where: { blindBoxSetId: id },
        data: { blindBoxSetId: null },
      });
    }

    await tx.collectorSet.delete({ where: { id } });
  });

  revalidateTag("navbar-navigation");
  revalidatePath("/", "layout");
  revalidatePath("/bo-suu-tap");
  return new NextResponse(null, { status: 204 });
}
