import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";
import {
  createPagination,
  normalizeAdminSearch,
  parseAdminPagination,
} from "@/lib/adminApi";
import {
  adminProductSchema,
  parseProductImages,
  productSortFields,
  serializeProductImages,
  stockFilters,
} from "@/lib/adminProduct";

function validationError(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Dữ liệu sản phẩm không hợp lệ",
        fieldErrors: error.flatten().fieldErrors,
      },
    },
    { status: 400 }
  );
}

async function validateProductRelations(input: {
  categoryId: string;
  merchantId: string;
  isCollector: boolean;
  setId?: string | null;
  setSlotNumber?: number | null;
  isBlindBox: boolean;
  blindBoxSetId?: string | null;
}) {
  const [category, merchant, collectorSet, blindBoxSet] = await Promise.all([
    prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }),
    prisma.merchant.findUnique({ where: { id: input.merchantId }, select: { id: true } }),
    input.isCollector && input.setId
      ? prisma.collectorSet.findUnique({ where: { id: input.setId }, select: { id: true, totalSlots: true } })
      : Promise.resolve(null),
    input.isBlindBox && input.blindBoxSetId
      ? prisma.collectorSet.findUnique({ where: { id: input.blindBoxSetId }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  if (!category) return { code: "CATEGORY_NOT_FOUND", message: "Danh mục không tồn tại", status: 404 };
  if (!merchant) return { code: "MERCHANT_NOT_FOUND", message: "Merchant không tồn tại", status: 404 };

  if (input.isCollector) {
    if (!collectorSet) return { code: "COLLECTOR_SET_NOT_FOUND", message: "Bộ sưu tập không tồn tại", status: 404 };
    if (!input.setSlotNumber || input.setSlotNumber > collectorSet.totalSlots) {
      return { code: "INVALID_COLLECTOR_SLOT", message: "Slot nằm ngoài phạm vi bộ sưu tập", status: 400 };
    }

    const occupiedSlot = await prisma.product.findFirst({
      where: {
        setId: input.setId,
        setSlotNumber: input.setSlotNumber,
      },
      select: { id: true },
    });

    if (occupiedSlot) {
      return { code: "COLLECTOR_SLOT_OCCUPIED", message: "Slot sưu tập đã có sản phẩm", status: 409 };
    }
  }

  if (input.isBlindBox && !blindBoxSet) {
    return { code: "BLIND_BOX_SET_NOT_FOUND", message: "Bộ sưu tập túi mù không tồn tại", status: 404 };
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parseAdminPagination(searchParams);
  const search = normalizeAdminSearch(searchParams.get("search"));
  const categoryId = searchParams.get("categoryId") || undefined;
  const merchantId = searchParams.get("merchantId") || undefined;
  const setId = searchParams.get("setId") || undefined;
  const stock = stockFilters.includes(searchParams.get("stock") as any)
    ? (searchParams.get("stock") as (typeof stockFilters)[number])
    : "all";
  const isCollectorParam = searchParams.get("isCollector");
  const collectorOnly = searchParams.get("collectorOnly") === "true";
  const sortParam = searchParams.get("sort");
  const sort = productSortFields.includes(sortParam as any) ? sortParam! : "title";
  const direction = searchParams.get("direction") === "desc" ? "desc" : "asc";

  const where = {
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { slug: { contains: search } },
          ],
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(merchantId ? { merchantId } : {}),
    ...(setId ? { setId } : {}),
    ...(stock === "in-stock" ? { inStock: { gt: 0 } } : {}),
    ...(stock === "out-of-stock" ? { inStock: 0 } : {}),
    ...(collectorOnly
      ? { isCollector: true, setId: { not: null }, setSlotNumber: { not: null } }
      : {}),
    ...(!collectorOnly && isCollectorParam === "true" ? { isCollector: true } : {}),
    ...(!collectorOnly && isCollectorParam === "false" ? { isCollector: false } : {}),
  };

  const [products, totalItems] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ [sort]: direction }, { id: "asc" }],
      skip,
      take: limit,
      include: {
        category: { select: { id: true, name: true } },
        merchant: { select: { id: true, name: true } },
        set: { select: { id: true, name: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    items: products.map((product) => ({
      ...product,
      images: parseProductImages(product.images),
    })),
    pagination: createPagination(page, limit, totalItems),
  });
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = adminProductSchema.safeParse(body);

  if (!parsed.success) return validationError(parsed.error);

  const existingSlug = await prisma.product.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });

  if (existingSlug) {
    return NextResponse.json(
      { error: { code: "SLUG_ALREADY_EXISTS", message: "Slug đã tồn tại" } },
      { status: 409 }
    );
  }

  const relationError = await validateProductRelations(parsed.data);
  if (relationError) {
    return NextResponse.json(
      { error: { code: relationError.code, message: relationError.message } },
      { status: relationError.status }
    );
  }

  const product = await prisma.product.create({
    data: {
      ...parsed.data,
      images: serializeProductImages(parsed.data.images),
    },
    include: {
      category: { select: { id: true, name: true } },
      merchant: { select: { id: true, name: true } },
      set: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(
    {
      ...product,
      images: parseProductImages(product.images),
    },
    { status: 201 }
  );
}
