import { OrderStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildAdminOrderSearchWhere } from "@/lib/adminOrderSearch";
import { validationError } from "@/lib/adminResponses";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year!, month! - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month! - 1 &&
      date.getUTCDate() === day
    );
  });

const querySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
});

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  const { search, status, dateFrom, dateTo } = parsed.data;
  const where: Prisma.Customer_orderWhereInput = {
    ...(status ? { status } : {}),
    ...(dateFrom || dateTo
      ? {
          dateTime: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
          },
        }
      : {}),
    ...buildAdminOrderSearchWhere(search),
  };
  const items = await prisma.customer_order.findMany({
    where,
    orderBy: { dateTime: "desc" },
    select: {
      orderNumber: true,
      name: true,
      lastname: true,
      email: true,
      phone: true,
      status: true,
      total: true,
      dateTime: true,
    },
  });

  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
