import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAccountOrderOwnershipWhere, normalizeAccountOrderStatus } from "@/lib/accountOrders";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderWhere = getAccountOrderOwnershipWhere(user);

  const [orders, sets, redemptionCodes] = await Promise.all([
    prisma.customer_order.findMany({
      where: orderWhere,
      select: {
        status: true,
      },
    }),
    prisma.collectorSet.findMany({
      select: {
        id: true,
        totalSlots: true,
      },
    }),
    prisma.redemptionCode.findMany({
      where: {
        userId: user.id,
        status: "REDEEMED",
      },
      select: {
        productId: true,
      },
    }),
  ]);

  const collectorProducts = await prisma.product.findMany({
    where: {
      isCollector: true,
      setId: {
        in: sets.map((set) => set.id),
      },
    },
    select: {
      id: true,
      setId: true,
    },
  });

  const unlockedProductIds = new Set(redemptionCodes.map((code) => code.productId));
  const unlockedCollectionSlots = collectorProducts.filter((product) => unlockedProductIds.has(product.id)).length;
  const totalCollectionSlots = sets.reduce((sum, set) => sum + set.totalSlots, 0);
  const completedCollectionSets = sets.filter((set) => {
    const productsInSet = collectorProducts.filter((product) => product.setId === set.id);
    return productsInSet.length === set.totalSlots && productsInSet.every((product) => unlockedProductIds.has(product.id));
  }).length;
  const completedOrderCount = orders.filter((order) => normalizeAccountOrderStatus(order.status) === "delivered").length;
  const activeOrderCount = orders.filter((order) => {
    const status = normalizeAccountOrderStatus(order.status);
    return status !== "delivered" && status !== "canceled";
  }).length;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? "",
      role: user.role ?? "user",
    },
    stats: {
      orderCount: orders.length,
      activeOrderCount,
      completedOrderCount,
      unlockedCollectionSlots,
      totalCollectionSlots,
      completedCollectionSets,
    },
  });
}
