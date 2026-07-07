import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { adminError } from "@/lib/adminResponses";
import prisma from "@/utils/db";
import { requireAdminApi } from "@/utils/adminAuth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { productId } = await params;
  const existing = await prisma.featuredProduct.findUnique({
    where: { productId },
    select: { id: true },
  });

  if (!existing) {
    return adminError(
      404,
      "FEATURED_PRODUCT_NOT_FOUND",
      "Sản phẩm không nằm trong danh sách nổi bật."
    );
  }

  await prisma.featuredProduct.delete({ where: { productId } });

  const remaining = await prisma.featuredProduct.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { productId: true },
  });

  await prisma.$transaction(
    remaining.map((item, index) =>
      prisma.featuredProduct.update({
        where: { productId: item.productId },
        data: { sortOrder: index },
      })
    )
  );

  revalidatePath("/");

  return NextResponse.json({ ok: true });
}
