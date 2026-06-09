import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";
import { commonValidations } from "@/utils/validation";
import {
  createPagination,
  isRole,
  normalizeAdminSearch,
  parseAdminPagination,
} from "@/lib/adminApi";

const roleSchema = z.enum(["admin", "user"]);

const createUserSchema = z.object({
  email: commonValidations.email,
  password: commonValidations.password,
  role: roleSchema.default("user"),
});

function validationError(error: z.ZodError) {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Dữ liệu không hợp lệ",
        fieldErrors: error.flatten().fieldErrors,
      },
    },
    { status: 400 }
  );
}

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parseAdminPagination(searchParams);
  const search = normalizeAdminSearch(searchParams.get("search"));
  const roleParam = searchParams.get("role");
  const role = isRole(roleParam) ? roleParam : null;
  const sort = searchParams.get("sort") === "role" ? "role" : "email";
  const direction = searchParams.get("direction") === "desc" ? "desc" : "asc";

  const where = {
    ...(search
      ? {
          email: {
            contains: search,
          },
        }
      : {}),
    ...(role ? { role } : {}),
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
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: { code: "EMAIL_ALREADY_EXISTS", message: "Email đã tồn tại" } },
      { status: 409 }
    );
  }

  const password = await bcrypt.hash(parsed.data.password, 14);
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
    },
  });

  return NextResponse.json(user, { status: 201 });
}
