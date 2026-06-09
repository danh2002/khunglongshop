import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adminError,
  isPrismaUniqueError,
  normalizeDisplayName,
  validationError,
} from "@/lib/adminResponses";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Tên danh mục là bắt buộc.").max(100),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { id } = await params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  return category
    ? NextResponse.json(category)
    : adminError(404, "CATEGORY_NOT_FOUND", "Không tìm thấy danh mục.");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const parsed = categorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const { id } = await params;
    const category = await prisma.category.update({
      where: { id },
      data: { name: normalizeDisplayName(parsed.data.name) },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(category);
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return adminError(409, "CATEGORY_NAME_EXISTS", "Tên danh mục đã tồn tại.");
    }
    return adminError(404, "CATEGORY_NOT_FOUND", "Không tìm thấy danh mục.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) return adminError(404, "CATEGORY_NOT_FOUND", "Không tìm thấy danh mục.");
  if (category._count.products > 0) {
    return adminError(
      409,
      "CATEGORY_HAS_PRODUCTS",
      `Danh mục đang có ${category._count.products} sản phẩm.`
    );
  }

  await prisma.category.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
