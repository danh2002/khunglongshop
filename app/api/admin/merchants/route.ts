import { MerchantStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPagination, parseAdminPagination } from "@/lib/adminApi";
import { normalizeDisplayName, validationError } from "@/lib/adminResponses";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

const merchantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().regex(/^[+()\d\s.-]{7,25}$/).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  status: z.nativeEnum(MerchantStatus).default("ACTIVE"),
});

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { page, limit, skip } = parseAdminPagination(request.nextUrl.searchParams);
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const rawStatus = request.nextUrl.searchParams.get("status");
  const status = rawStatus && Object.values(MerchantStatus).includes(rawStatus as MerchantStatus)
    ? (rawStatus as MerchantStatus)
    : undefined;
  const where: Prisma.MerchantWhereInput = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };
  const [items, totalItems] = await Promise.all([
    prisma.merchant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.merchant.count({ where }),
  ]);
  return NextResponse.json({ items, pagination: createPagination(page, limit, totalItems) });
}

export async function POST(request: Request) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const parsed = merchantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const merchant = await prisma.merchant.create({
    data: {
      ...parsed.data,
      name: normalizeDisplayName(parsed.data.name),
      email: parsed.data.email?.toLowerCase() || null,
      description: parsed.data.description || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
    },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(merchant, { status: 201 });
}
