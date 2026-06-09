import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";

function rangeStart(range: string | null) {
  const now = new Date();

  if (range === "7d" || range === "30d") {
    const start = new Date(now);
    start.setDate(start.getDate() - (range === "7d" ? 7 : 30));
    return start;
  }

  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const start = rangeStart(request.nextUrl.searchParams.get("range"));
  const orderWhere = { dateTime: { gte: start } };

  const [
    orderCount,
    revenue,
    userCount,
    productCount,
    redeemedCodeCount,
    completedSetCount,
    recentOrders,
    recentRewards,
  ] = await Promise.all([
    prisma.customer_order.count({ where: orderWhere }),
    prisma.customer_order.aggregate({ where: orderWhere, _sum: { total: true } }),
    prisma.user.count({ where: { role: "user", isActive: true } }),
    prisma.product.count(),
    prisma.redemptionCode.count({ where: { status: "REDEEMED", usedAt: { gte: start } } }),
    prisma.setReward.count({ where: { grantedAt: { gte: start } } }),
    prisma.customer_order.findMany({
      orderBy: { dateTime: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true,
        total: true,
        status: true,
        dateTime: true,
      },
    }),
    prisma.setReward.findMany({
      orderBy: { grantedAt: "desc" },
      take: 5,
      include: {
        set: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
      },
    }),
  ]);

  return NextResponse.json({
    metrics: {
      orderCount,
      revenue: revenue._sum.total ?? 0,
      userCount,
      productCount,
      redeemedCodeCount,
      completedSetCount,
    },
    recentOrders,
    recentRewards,
  });
}
