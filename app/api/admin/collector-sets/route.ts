import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPagination, parseAdminPagination } from "@/lib/adminApi";
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

const setSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(120).optional(),
  image: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  rewardDescription: z.string().trim().max(500).nullable().optional(),
  rewardCodeTemplate: z.string().trim().max(100).nullable().optional(),
  totalSlots: z.literal(10).default(10),
  ...collectorSetHeroFieldSchemas,
}).superRefine(validateCollectorSetHeroFields);

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { page, limit, skip } = parseAdminPagination(request.nextUrl.searchParams);
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const where: Prisma.CollectorSetWhereInput = search ? { name: { contains: search } } : {};
  const [sets, totalItems] = await Promise.all([
    prisma.collectorSet.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { products: true, setRewards: true } } },
    }),
    prisma.collectorSet.count({ where }),
  ]);
  const productIds = sets.length
    ? await prisma.product.findMany({
        where: { setId: { in: sets.map((set) => set.id) } },
        select: { id: true, setId: true },
      })
    : [];
  const redeemedByProduct = productIds.length
    ? await prisma.redemptionCode.groupBy({
        by: ["productId"],
        where: {
          productId: { in: productIds.map((product) => product.id) },
          status: "REDEEMED",
        },
        _count: { _all: true },
      })
    : [];
  const redeemedMap = new Map(
    redeemedByProduct.map((item) => [item.productId, item._count._all])
  );

  return NextResponse.json({
    items: sets.map((set) => ({
      ...set,
      assignedProductCount: set._count.products,
      completedUserCount: set._count.setRewards,
      redeemedCodeCount: productIds
        .filter((product) => product.setId === set.id)
        .reduce((sum, product) => sum + (redeemedMap.get(product.id) ?? 0), 0),
    })),
    pagination: createPagination(page, limit, totalItems),
  });
}

export async function POST(request: Request) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const parsed = setSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const duplicate = await prisma.collectorSet.findFirst({
    where: { name: normalizeDisplayName(parsed.data.name) },
    select: { id: true },
  });
  if (duplicate) return adminError(409, "COLLECTOR_SET_NAME_EXISTS", "Tên bộ sưu tập đã tồn tại.");

  try {
    const collectorSet = await prisma.collectorSet.create({
      data: {
        ...parsed.data,
        name: normalizeDisplayName(parsed.data.name),
        slug: toSlug(parsed.data.slug || parsed.data.name),
        image: parsed.data.image || null,
        description: parsed.data.description || null,
        rewardDescription: parsed.data.rewardDescription || null,
        rewardCodeTemplate: parsed.data.rewardCodeTemplate || null,
        ...normalizeCollectorSetHeroData(parsed.data),
      },
    });
    revalidateTag("navbar-navigation");
    revalidatePath("/", "layout");
    revalidatePath("/bo-suu-tap");
    return NextResponse.json(collectorSet, { status: 201 });
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return adminError(409, "COLLECTOR_SET_SLUG_EXISTS", "Tên hoặc slug bộ sưu tập đã tồn tại.");
    }
    throw error;
  }
}
