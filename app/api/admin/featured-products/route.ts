import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminError, validationError } from "@/lib/adminResponses";
import prisma from "@/utils/db";
import { requireAdminApi } from "@/utils/adminAuth";

const addFeaturedProductSchema = z.object({
  productId: z.string().min(1),
});

const collectorKeychainWhere = (productId: string) => ({
  id: productId,
  isVisible: true,
  isCollector: true,
  isBlindBox: false,
  setId: { not: null },
  setSlotNumber: { not: null },
});

const featuredProductSelect = {
  id: true,
  productId: true,
  sortOrder: true,
  createdAt: true,
  product: {
    select: {
      id: true,
      slug: true,
      title: true,
      mainImage: true,
      isVisible: true,
      isCollector: true,
      isBlindBox: true,
      setId: true,
      setSlotNumber: true,
      set: { select: { id: true, name: true } },
    },
  },
};

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  const items = await prisma.featuredProduct.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: featuredProductSelect,
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = addFeaturedProductSchema.safeParse(body);

  if (!parsed.success) return validationError(parsed.error);

  const { productId } = parsed.data;
  const product = await prisma.product.findFirst({
    where: collectorKeychainWhere(productId),
    select: { id: true },
  });

  if (!product) {
    return adminError(
      404,
      "FEATURED_PRODUCT_NOT_ELIGIBLE",
      "Sản phẩm không tồn tại hoặc không phải móc khoá collector đang hiển thị."
    );
  }

  const existing = await prisma.featuredProduct.findUnique({
    where: { productId },
    select: { id: true },
  });

  if (existing) {
    return adminError(
      409,
      "FEATURED_PRODUCT_ALREADY_EXISTS",
      "Sản phẩm đã nằm trong danh sách nổi bật."
    );
  }

  const maxSort = await prisma.featuredProduct.aggregate({
    _max: { sortOrder: true },
  });

  const item = await prisma.featuredProduct.create({
    data: {
      productId,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
    select: featuredProductSelect,
  });

  revalidatePath("/");

  return NextResponse.json(item, { status: 201 });
}
