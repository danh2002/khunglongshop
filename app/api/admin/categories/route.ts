import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPagination, parseAdminPagination } from "@/lib/adminApi";
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

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { page, limit, skip } = parseAdminPagination(request.nextUrl.searchParams);
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const where: Prisma.CategoryWhereInput = search ? { name: { contains: search } } : {};
  const [items, totalItems] = await Promise.all([
    prisma.category.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.category.count({ where }),
  ]);

  return NextResponse.json({ items, pagination: createPagination(page, limit, totalItems) });
}

export async function POST(request: Request) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const parsed = categorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const category = await prisma.category.create({
      data: { name: normalizeDisplayName(parsed.data.name) },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return adminError(409, "CATEGORY_NAME_EXISTS", "Tên danh mục đã tồn tại.");
    }
    console.error("Create category failed", error);
    return adminError(500, "INTERNAL_ERROR", "Không thể tạo danh mục.");
  }
}
