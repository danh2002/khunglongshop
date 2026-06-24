import { OrderStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPagination, parseAdminPagination } from "@/lib/adminApi";
import { validationError } from "@/lib/adminResponses";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

const querySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sort: z.enum(["dateTime", "total", "status"]).default("dateTime"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  const { page, limit, skip } = parseAdminPagination(request.nextUrl.searchParams);
  const { search, status, dateFrom, dateTo, sort, direction } = parsed.data;
  const where: Prisma.Customer_orderWhereInput = {
    ...(status ? { status } : {}),
    ...(dateFrom || dateTo
      ? { dateTime: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } }
      : {}),
    ...(search
      ? {
          OR: [
            { id: { contains: search } },
            { orderNumber: Number.isFinite(Number(search)) ? Number(search) : undefined },
            { email: { contains: search } },
            { name: { contains: search } },
            { lastname: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, totalItems] = await Promise.all([
    prisma.customer_order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort]: direction },
      select: {
        id: true,
        orderNumber: true,
        name: true,
        lastname: true,
        email: true,
        phone: true,
        country: true,
        total: true,
        status: true,
        dateTime: true,
      },
    }),
    prisma.customer_order.count({ where }),
  ]);

  return NextResponse.json({ items, pagination: createPagination(page, limit, totalItems) });
}
