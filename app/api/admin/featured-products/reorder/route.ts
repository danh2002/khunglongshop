import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminError, validationError } from "@/lib/adminResponses";
import prisma from "@/utils/db";
import { requireAdminApi } from "@/utils/adminAuth";

const reorderFeaturedProductsSchema = z.object({
  productIds: z.array(z.string().min(1)),
});

export async function PATCH(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = reorderFeaturedProductsSchema.safeParse(body);

  if (!parsed.success) return validationError(parsed.error);

  const { productIds } = parsed.data;
  const uniqueProductIds = new Set(productIds);

  if (uniqueProductIds.size !== productIds.length) {
    return adminError(
      400,
      "DUPLICATE_FEATURED_PRODUCT_IDS",
      "Danh sách sắp xếp có sản phẩm bị trùng."
    );
  }

  const current = await prisma.featuredProduct.findMany({
    select: { productId: true },
  });
  const currentIds = new Set(current.map((item) => item.productId));
  const hasSameItems =
    currentIds.size === uniqueProductIds.size &&
    [...currentIds].every((productId) => uniqueProductIds.has(productId));

  if (!hasSameItems) {
    return adminError(
      400,
      "FEATURED_REORDER_MISMATCH",
      "Danh sách sắp xếp không khớp với sản phẩm nổi bật hiện tại."
    );
  }

  await prisma.$transaction(
    productIds.map((productId, index) =>
      prisma.featuredProduct.update({
        where: { productId },
        data: { sortOrder: index },
      })
    )
  );

  revalidatePath("/");

  return NextResponse.json({ ok: true });
}
