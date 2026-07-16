import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import {
  adminError,
  isPrismaUniqueError,
  normalizeDisplayName,
  validationError,
} from "@/lib/adminResponses";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";
import { toSlug } from "@/lib/slug";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Tên danh mục là bắt buộc.").max(100),
  slug: z.string().trim().max(120).optional(),
  icon: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
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
      data: {
        name: normalizeDisplayName(parsed.data.name),
        slug: toSlug(parsed.data.slug || parsed.data.name),
        icon: parsed.data.icon || null,
        description: parsed.data.description || null,
      },
      include: { _count: { select: { products: true } } },
    });
    revalidateTag("navbar-navigation");
    revalidatePath("/", "layout");
    return NextResponse.json(category);
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return adminError(409, "CATEGORY_NAME_EXISTS", "Tên danh mục đã tồn tại.");
    }
    return adminError(404, "CATEGORY_NOT_FOUND", "Không tìm thấy danh mục.");
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

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) return adminError(404, "CATEGORY_NOT_FOUND", "Không tìm thấy danh mục.");
  if (category._count.products > 0 && !force) {
    return adminError(
      409,
      "CATEGORY_HAS_PRODUCTS",
      `Danh mục đang có ${category._count.products} sản phẩm.`
    );
  }

  await prisma.$transaction(async (tx) => {
    if (force && category._count.products > 0) {
      const fallbackCategory =
        (await tx.category.findFirst({
          where: {
            id: { not: id },
            OR: [{ slug: "chua-phan-loai" }, { name: "Chưa phân loại" }],
          },
          select: { id: true },
        })) ??
        (await tx.category.create({
          data: {
            name:
              category.name === "Chưa phân loại"
                ? `Chưa phân loại ${id.slice(0, 8)}`
                : "Chưa phân loại",
            slug:
              category.slug === "chua-phan-loai"
                ? `chua-phan-loai-${id.slice(0, 8)}`
                : "chua-phan-loai",
            description: "Danh mục mặc định cho sản phẩm chưa được phân loại.",
          },
          select: { id: true },
        }));

      await tx.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: fallbackCategory.id },
      });
    }
    await tx.category.delete({ where: { id } });
  });

  revalidateTag("navbar-navigation");
  revalidatePath("/", "layout");
  return new NextResponse(null, { status: 204 });
}
