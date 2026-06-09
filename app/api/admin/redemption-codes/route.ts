import { Prisma, RedemptionCodeStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPagination, parseAdminPagination } from "@/lib/adminApi";
import { adminError, isPrismaUniqueError, validationError } from "@/lib/adminResponses";
import { generateRedemptionCode } from "@/lib/codes";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

const createSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(500).default(1),
  orderId: z.string().min(1).nullable().optional(),
  userId: z.string().min(1).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { page, limit, skip } = parseAdminPagination(request.nextUrl.searchParams);
  const params = request.nextUrl.searchParams;
  const search = params.get("search")?.trim() ?? "";
  const setId = params.get("set") || undefined;
  const productId = params.get("product") || undefined;
  const userId = params.get("user") || undefined;
  const rawStatus = params.get("status");
  const status =
    rawStatus && Object.values(RedemptionCodeStatus).includes(rawStatus as RedemptionCodeStatus)
      ? (rawStatus as RedemptionCodeStatus)
      : undefined;
  const where: Prisma.RedemptionCodeWhereInput = {
    ...(status ? { status } : {}),
    ...(productId ? { productId } : {}),
    ...(userId ? { userId } : {}),
    ...(setId ? { product: { setId } } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search } },
            { product: { title: { contains: search } } },
            { user: { email: { contains: search } } },
            { orderId: { contains: search } },
          ],
        }
      : {}),
  };
  const [items, totalItems] = await Promise.all([
    prisma.redemptionCode.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            mainImage: true,
            setSlotNumber: true,
            set: { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, email: true, role: true } },
        order: { select: { id: true, email: true } },
      },
    }),
    prisma.redemptionCode.count({ where }),
  ]);
  return NextResponse.json({ items, pagination: createPagination(page, limit, totalItems) });
}

export async function POST(request: Request) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const [product, user, order] = await Promise.all([
    prisma.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true } }),
    parsed.data.userId
      ? prisma.user.findUnique({
          where: { id: parsed.data.userId },
          select: { id: true, role: true },
        })
      : null,
    parsed.data.orderId
      ? prisma.customer_order.findUnique({
          where: { id: parsed.data.orderId },
          select: { id: true },
        })
      : null,
  ]);
  if (!product) return adminError(404, "PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm.");
  if (parsed.data.userId && (!user || user.role !== "user")) {
    return adminError(400, "INVALID_CODE_OWNER_ROLE", "Owner phải là tài khoản user.");
  }
  if (parsed.data.orderId && !order) {
    return adminError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");
  }

  const created = [];
  for (let index = 0; index < parsed.data.quantity; index += 1) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        created.push(
          await prisma.redemptionCode.create({
            data: {
              code: generateRedemptionCode(),
              productId: parsed.data.productId,
              orderId: parsed.data.orderId ?? null,
              userId: parsed.data.userId ?? null,
              status: "ACTIVE",
              isUsed: false,
            },
          })
        );
        break;
      } catch (error) {
        if (!isPrismaUniqueError(error) || attempt === 4) throw error;
      }
    }
  }
  return NextResponse.json({ items: created }, { status: 201 });
}
