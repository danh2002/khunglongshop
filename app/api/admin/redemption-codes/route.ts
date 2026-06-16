import { Prisma, RedemptionCodeStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPagination, parseAdminPagination } from "@/lib/adminApi";
import { adminError, isPrismaUniqueError, validationError } from "@/lib/adminResponses";
import {
  createUniqueRedemptionCodeValue,
  RedemptionCodeGenerationError,
} from "@/lib/redemptionCodes";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

const createSchema = z
  .object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(500),
  })
  .strict();

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

  if (rawStatus && !Object.values(RedemptionCodeStatus).includes(rawStatus as RedemptionCodeStatus)) {
    return adminError(400, "VALIDATION_ERROR", "Trạng thái code không hợp lệ.");
  }

  const status = rawStatus ? (rawStatus as RedemptionCodeStatus) : undefined;
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
  const { admin, response } = await requireAdminApi();
  if (response) return response;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: {
      id: true,
      title: true,
      slug: true,
      mainImage: true,
      isCollector: true,
      setId: true,
      setSlotNumber: true,
      set: { select: { id: true, name: true } },
    },
  });

  if (!product) return adminError(404, "PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm.");
  if (!product.isCollector || !product.setId || !product.setSlotNumber || !product.set) {
    return adminError(422, "INVALID_COLLECTOR_ITEM", "Sản phẩm không phải collector item hợp lệ.");
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const codes = [];

      for (let index = 0; index < parsed.data.quantity; index += 1) {
        for (let attempt = 0; attempt < 10; attempt += 1) {
          try {
            codes.push(
              await tx.redemptionCode.create({
                data: {
                  code: await createUniqueRedemptionCodeValue(tx),
                  productId: product.id,
                  userId: null,
                  orderId: null,
                  status: "ACTIVE",
                  isUsed: false,
                  usedAt: null,
                },
              })
            );
            break;
          } catch (error) {
            if (!isPrismaUniqueError(error) || attempt === 9) throw error;
          }
        }
      }

      await tx.adminAuditLog.create({
        data: {
          actorId: admin!.id,
          action: "REDEMPTION_CODES_CREATED",
          entityType: "Product",
          entityId: product.id,
          metadata: {
            actorId: admin!.id,
            productId: product.id,
            quantity: parsed.data.quantity,
            redemptionCodeIds: codes.map((code) => code.id),
          },
        },
      });

      return codes;
    });

    return NextResponse.json(
      {
        product: {
          id: product.id,
          title: product.title,
          slug: product.slug,
          mainImage: product.mainImage,
          setSlotNumber: product.setSlotNumber,
          set: product.set,
        },
        items: created,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof RedemptionCodeGenerationError || isPrismaUniqueError(error)) {
      return adminError(500, "CODE_GENERATION_FAILED", "Không thể tạo đủ code duy nhất.");
    }
    throw error;
  }
}
