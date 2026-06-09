import { MerchantStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminError, normalizeDisplayName, validationError } from "@/lib/adminResponses";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

const merchantSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().regex(/^[+()\d\s.-]{7,25}$/).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  status: z.nativeEnum(MerchantStatus).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  return merchant
    ? NextResponse.json(merchant)
    : adminError(404, "MERCHANT_NOT_FOUND", "Không tìm thấy merchant.");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const parsed = merchantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const { id } = await params;

  try {
    const merchant = await prisma.merchant.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.name ? { name: normalizeDisplayName(parsed.data.name) } : {}),
        ...(parsed.data.email !== undefined
          ? { email: parsed.data.email?.toLowerCase() || null }
          : {}),
      },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(merchant);
  } catch {
    return adminError(404, "MERCHANT_NOT_FOUND", "Không tìm thấy merchant.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!merchant) return adminError(404, "MERCHANT_NOT_FOUND", "Không tìm thấy merchant.");
  if (merchant._count.products > 0) {
    return adminError(
      409,
      "MERCHANT_HAS_PRODUCTS",
      `Merchant đang có ${merchant._count.products} sản phẩm.`
    );
  }
  await prisma.merchant.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
