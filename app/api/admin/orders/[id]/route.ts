import { NextResponse } from "next/server";
import { adminError } from "@/lib/adminResponses";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { id } = await params;
  const order = await prisma.customer_order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, role: true, isActive: true } },
      products: {
        select: {
          id: true,
          quantity: true,
          productId: true,
          productTitle: true,
          productSlug: true,
          unitPrice: true,
          snapshotSource: true,
          product: { select: { title: true, slug: true, mainImage: true } },
        },
      },
      blindBoxAllocations: {
        orderBy: [{ orderItemId: "asc" }, { unitIndex: "asc" }],
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              mainImage: true,
              setSlotNumber: true,
            },
          },
          redemptionCode: {
            select: { code: true, status: true },
          },
          poolVersion: {
            select: { version: true, collectorSetId: true },
          },
        },
      },
      _count: { select: { redemptionCodes: true } },
    },
  });

  if (!order) return adminError(404, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng.");

  return NextResponse.json(order);
}
