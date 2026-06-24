import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import {
  getAccountOrderOwnershipWhere,
  getStatusRawValues,
  normalizeAccountOrderStatus,
  toIsoDate,
} from "@/lib/accountOrders";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const parsedPage = Number(params.get("page") || 1);
  const parsedLimit = Number(params.get("limit") || 10);
  const page = Number.isFinite(parsedPage) ? Math.max(Math.trunc(parsedPage), 1) : 1;
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 50) : 10;
  const status = params.get("status");
  const rawStatuses = getStatusRawValues(status);
  const where = {
    AND: [
      getAccountOrderOwnershipWhere(user),
      ...(rawStatuses
        ? [
            {
              status: {
                in: rawStatuses,
              },
            },
          ]
        : []),
    ],
  };

  const [orders, total] = await Promise.all([
    prisma.customer_order.findMany({
      where,
      orderBy: {
        dateTime: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                mainImage: true,
              },
            },
          },
        },
      },
    }),
    prisma.customer_order.count({ where }),
  ]);

  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      dateTime: toIsoDate(order.dateTime),
      status: normalizeAccountOrderStatus(order.status),
      rawStatus: order.status,
      total: order.total,
      itemCount: order.products.reduce((sum, item) => sum + item.quantity, 0),
      productsPreview: order.products.slice(0, 3).map((item) => ({
        id: item.product.id,
        title: item.product.title,
        image: item.product.mainImage,
        quantity: item.quantity,
      })),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  });
}
