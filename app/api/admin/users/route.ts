import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { adminUserCreateSchema, adminUserListQuerySchema } from "@/lib/adminUserValidation";
import { adminError, isPrismaUniqueError, validationError } from "@/lib/adminResponses";
import { createPagination } from "@/lib/adminApi";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const parsed = adminUserListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { page, limit, search, role, status, sort, direction } = parsed.data;
  const skip = (page - 1) * limit;
  const normalizedSearch = search?.toLowerCase();
  const where = {
    ...(normalizedSearch
      ? { email: { contains: normalizedSearch } }
      : {}),
    ...(role ? { role } : {}),
    ...(status ? { isActive: status === "active" } : {}),
  };

  const [users, totalItems] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ [sort]: direction }, { id: "asc" }],
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        deactivatedAt: true,
        _count: {
          select: {
            orders: true,
            Wishlist: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    items: users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      deactivatedAt: user.deactivatedAt,
      orderCount: user._count.orders,
      wishlistCount: user._count.Wishlist,
    })),
    pagination: createPagination(page, limit, totalItems),
  });
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = adminUserCreateSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existingUser) {
    return adminError(409, "EMAIL_ALREADY_EXISTS", "Email đã tồn tại.");
  }

  const password = await bcrypt.hash(parsed.data.password, 14);

  try {
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        password,
        role: parsed.data.role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return adminError(409, "EMAIL_ALREADY_EXISTS", "Email đã tồn tại.");
    }

    throw error;
  }
}
