import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAccountOrderOwnershipWhere, normalizeAccountOrderStatus, toIsoDate } from "@/lib/accountOrders";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.customer_order.findFirst({
    where: {
      AND: [
        { id },
        getAccountOrderOwnershipWhere(user),
      ],
    },
    include: {
      products: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              mainImage: true,
              price: true,
            },
          },
        },
      },
      blindBoxAllocations: {
        where: { status: "ACTIVE" },
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
            select: { code: true, status: true, usedAt: true },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    dateTime: toIsoDate(order.dateTime),
    status: normalizeAccountOrderStatus(order.status),
    rawStatus: order.status,
    total: order.total,
    shipping: {
      name: order.name,
      lastname: order.lastname,
      phone: order.phone,
      address: order.adress,
      apartment: order.apartment,
      city: order.city,
      country: order.country,
      postalCode: order.postalCode,
    },
    products: order.products.map((item) => ({
      id: item.product.id,
      title: item.product.title,
      slug: item.product.slug,
      image: item.product.mainImage,
      price: item.product.price,
      quantity: item.quantity,
    })),
    blindBoxResults: order.blindBoxAllocations.map((allocation) => ({
      id: allocation.id,
      unitIndex: allocation.unitIndex,
      rarityTier: allocation.rarityTier,
      product: allocation.product,
      redemptionCode: allocation.redemptionCode,
    })),
  });
}
